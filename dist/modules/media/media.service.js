"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadEventCoverImage = uploadEventCoverImage;
const cloudinary_1 = require("../../lib/cloudinary");
async function uploadEventCoverImage(file) {
    if (!file) {
        throw new Error("Event cover image is required.");
    }
    return new Promise((resolve, reject) => {
        const stream = cloudinary_1.cloudinary.uploader
            .upload_stream({
            folder: "wowyou/events/covers",
            resource_type: "image",
            transformation: [
                {
                    width: 2000,
                    height: 1125,
                    crop: "limit",
                },
                {
                    quality: "auto",
                    fetch_format: "auto",
                },
            ],
        }, (error, result) => {
            if (error ||
                !result) {
                reject(error ??
                    new Error("Unable to upload event cover."));
                return;
            }
            resolve({
                url: result.secure_url,
                publicId: result.public_id,
                width: result.width,
                height: result.height,
            });
        });
        stream.end(file.buffer);
    });
}
