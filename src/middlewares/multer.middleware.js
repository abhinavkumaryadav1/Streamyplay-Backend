import multer from "multer"

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/temp')
  },
  filename: function (req, file, cb) {
    // Create a unique filename to avoid conflicts(same file dono me post karega to cloudinary ek ko upload karke delete kardegi file jo jo overwrite hui thi multer ke lime cuz same name)
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + '-' + file.originalname)
  }
})

export const upload = multer({
     storage,
     })
