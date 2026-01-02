import mongoose, {disconnect, isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary,deleteOnCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination


    const pipeline = [];

    // for using Full Text based search u need to create a search index in mongoDB atlas
    if (query) {
        pipeline.push({
            $search: {
                index: "search-videos",
                text: {
                    query: query,
                    path: ["title", "description"] //search only on title, desc
                }
            }
        });
    }

    if (userId) {
        if (!isValidObjectId(userId)) {
            throw new ApiError(400, "Invalid userId");
        }

        pipeline.push({
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        });
    }

    // fetch videos only that are set isPublished as true
    pipeline.push({ $match: { isPublished: true } });

    //sortBy can be views, createdAt, duration
    //sortType can be ascending(-1) or descending(1)
    if (sortBy && sortType) {
        pipeline.push({
            $sort: {
                [sortBy]: sortType === "asc" ? 1 : -1
            }
        });
    } else {
        pipeline.push({ $sort: { createdAt: -1 } });
    }

    pipeline.push(
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$ownerDetails"
        }
    )

    const videoAggregate = Video.aggregate(pipeline);

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    };

    const video = await Video.aggregatePaginate(videoAggregate, options);


    // return plain JS objects and include _id so frontend has a stable id and title
    // const allVideos =await Video.find({},{videoFile:1,thumbnail:1,title:1})
    // if(!allVideos)
    // {
    //     throw new ApiError(500,"Something went wrong while fetching videos from database")
    // }
    // // console.log("vid api res :",allVideos);
    
    return res.status(200).json(new ApiResponse(200,video,"All videos feathed successfully"))
})

//Video Upload and Publish
const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body 

    if ([title, description].some(
     (field) => !field || field.trim() === "" //.some checks if anyine is not present it returns true
))   {
        throw new ApiError(400, "All fields are required");
     }

     const videoFileLocalPath = req.files?.videoFile[0]?.path
     const thumbnailLocalPath = req.files?.thumbnail[0]?.path

     if(!videoFileLocalPath) throw new ApiError(400,"video File is required")
     if(!thumbnailLocalPath) throw new ApiError(400,"Thumbnail is required for the video")   

     const videoFile = await uploadOnCloudinary(videoFileLocalPath) 
     const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

     if(!videoFile) throw new ApiError(400,"Video file has not properly uploaded to cloud please upload again")
     if(!thumbnail) throw new ApiError(400,"Thumbnail file has not properly uploaded to cloud please upload again")

    const video = await Video.create({
        title,
        description,
        videoFile: {
            url: videoFile.url,
            public_id: videoFile.public_id
        },
        thumbnail: {                                            
            url: thumbnail.url,
            public_id: thumbnail.public_id
        },
        duration: videoFile?.duration || 0,
        owner:req.user?._id,
        isPublished:true
    })    

    const videoUploaded = await Video.find(video._id) 
    if(!videoUploaded) throw new ApiError(501,"Something went wrong while publishing the video")

        return res.status(201).json(new ApiResponse(201,video,"Video uploaded successfully"))

    // TODO: get video, upload to cloudinary, create video
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) { // if someone hit endpoint with incorrect id say 1234abcd then it will start searching and make pipeline for this id which does not exist which will mess with the error codes and sabotage it thats why we are checking id and type through this inbuild function 
        throw new ApiError(400, "Invalid videoId");
    }

        if (!isValidObjectId(req.user?._id)) {
        throw new ApiError(400, "Invalid userId");
    }


     const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers"
                        }
                    },
                    {
                        $addFields: {
                            subscribersCount: {
                                $size: "$subscribers"
                            },
                            isSubscribed: {
                                $cond: {
                                    if: {
                                        $in: [
                                            req.user?._id,
                                            "$subscribers.subscriber"
                                        ]
                                    },
                                    then: true,
                                    else: false
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            username: 1,
                            avatar: 1,
                            subscribersCount: 1,
                            isSubscribed: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes"
                },
                owner: {
                    $first: "$owner"
                },
                isLiked: {
                    $cond: {
                        if: {$in: [req.user?._id, "$likes.likedBy"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                "videoFile.url": 1,
                title: 1,
                description: 1,
                views: 1,
                createdAt: 1,
                duration: 1,
                comments: 1,
                owner: 1,
                likesCount: 1,
                isLiked: 1
            }
        }
    ]);

    if (!video) {
        throw new ApiError(500, "failed to fetch video");
    }

    // increment views if video fetched successfully
    await Video.findByIdAndUpdate(videoId, {
        $inc: {
            views: 1
        }
    });

    // add this video to user watch history
    await User.findByIdAndUpdate(req.user?._id, {
        $addToSet: {
            watchHistory: videoId
        }
    });




    
    return res
        .status(200)
        .json(
            new ApiResponse(200, video[0], "video details fetched successfully")
        );

})

const updateVideo = asyncHandler(async (req, res) => {
    //TODO: update video details like title, description, thumbnail
    const user = req.user?._id
    if (!isValidObjectId(user)) {
        throw new ApiError(400, "Invalid UserId");
    }
    const {videoId} = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId");
    }

    const video = await Video.findById(videoId)
    
    if(!video) throw new ApiError(400,"The Requested Video does not exist")

    if(video.owner.toString() !== req.user._id.toString())   
        {
            throw new ApiError(404,"You are not Authorised to make this request")
        } 

        const {title , description} = req.body

        if(!(title && description))
        {
            throw new ApiError(400,"Both Title and Description is required to Proceed")
        }

        const updateData = { title, description };

        // Only update thumbnail if a new one is provided
        const thumbnailLocalPath = req.file?.path;
        if (thumbnailLocalPath) {
            const thumbnailToBeDeleted = video.thumbnail.public_id;
            const newThumbnail = await uploadOnCloudinary(thumbnailLocalPath);
            
            if (!newThumbnail) {
                throw new ApiError(400, "Thumbnail Failed to upload");
            }
            
            updateData.thumbnail = {
                public_id: newThumbnail.public_id,
                url: newThumbnail.url
            };
            
            // Delete old thumbnail after successful upload
            await deleteOnCloudinary(thumbnailToBeDeleted);
        }
    
        const updatedVideo = await Video.findByIdAndUpdate(
            videoId,
            { $set: updateData },
            { new: true }
        );
    
        if(!updatedVideo) {
            throw new ApiError(500,"Failed to Update the Video")
        }

        return res.status(200).json(new ApiResponse(200,updatedVideo,"Video Updated Successfully"))

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const video = await Video.findById(videoId)
    if(!video) 
        {
            throw new ApiError(404,"Video not found that has to be deleted")
        }

    if( video?.owner.toString()  !==req.user?._id.toString())
        {
            throw new ApiError(404,"You are not Authorised to Delete this Asset")
        }

    const videoDeleted = await Video.findByIdAndDelete(video._id)

    if(!videoDeleted)
    {
        throw new ApiError(500,"Something went wrong while Deleting the Asset")
    }

    await deleteOnCloudinary(video.thumbnail.public_id)
    await deleteOnCloudinary(video.videoFile.public_id,"video")

    // delete video likes
    await Like.deleteMany({
        video: videoId
    })

     // delete video comments
    await Comment.deleteMany({
        video: videoId,
    })

    return res.status(200).json(new ApiResponse(200,{},"Asset Deleted Succeccfully"))
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (video?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(
            400,
            "You can't toogle publish status as you are not the owner"
        );
    }

    const toggledVideoPublish = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: !video?.isPublished
            }
        },
        { new: true }
    );

    if (!toggledVideoPublish) {
        throw new ApiError(500, "Failed to toogle video publish status");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { isPublished: toggledVideoPublish.isPublished },
                "Video publish toggled successfully"
            )
        );
})

export {
    getAllVideos,            //Completed
    publishAVideo,          //completed
    getVideoById,          //complete
    updateVideo,          //completed
    deleteVideo,         //completed
    togglePublishStatus //completed
}
