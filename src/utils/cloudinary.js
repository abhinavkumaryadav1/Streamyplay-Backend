import {v2 as cloudinary} from 'cloudinary'
import { log } from 'console';
import fs from 'fs'

    // Configuration
    cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET, // Click 'View API Keys' above to copy your API secret
    });
    
    const uploadOnCloudinary = async (localFilePath) => {
        try {
            
            if(!localFilePath) return null; //localfilepath not exist
            //else upload
            const response = await cloudinary.uploader.upload(localFilePath,{
                resource_type:"auto",
            })
            delete response.api_key;
            delete response.signature;
            console.log("file successfully uploaded on cloudinary: " , response.url);
            console.log("cloudanary responce and its type:",typeof(response)," ",response);
            
            fs.unlinkSync(localFilePath)
            return response; // for user to extract information

        } catch (error) {
            fs.unlinkSync(localFilePath) //remove file from local server because it can hinder ther server(nahi upload hua dhang se to hata hi do na)
            console.log("something went wrong while uploading file on cloudinary from cloudinary fucntion. error: ",error);
            return null;  
        }
    }

    const deleteOnCloudinary = async (public_id, resource_type="image") => {
    try {
        if (!public_id) return null;

        //delete file from cloudinary
        const result = await cloudinary.uploader.destroy(public_id, {
            resource_type: `${resource_type}`
        });
    } catch (error) {
        return error;
        console.log("delete on cloudinary failed", error);
    }
};

    export {uploadOnCloudinary, deleteOnCloudinary}

     
