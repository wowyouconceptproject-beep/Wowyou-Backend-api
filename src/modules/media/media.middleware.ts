import multer from "multer";

const storage =
  multer.memoryStorage();

export const uploadEventCover =
  multer({
    storage,

    limits: {
      fileSize:
        10 * 1024 * 1024,
    },

    fileFilter: (
      _req,
      file,
      callback
    ) => {
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
      ];

      if (
        !allowedTypes.includes(
          file.mimetype
        )
      ) {
        callback(
          new Error(
            "Only JPG, PNG and WEBP images are allowed."
          )
        );

        return;
      }

      callback(
        null,
        true
      );
    },
  });