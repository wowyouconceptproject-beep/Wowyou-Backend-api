"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadEventCover = uploadEventCover;
const media_service_1 = require("./media.service");
async function uploadEventCover(req, res) {
    try {
        if (!req.file) {
            return res
                .status(400)
                .json({
                success: false,
                message: "Event cover image is required.",
            });
        }
        const image = await (0, media_service_1.uploadEventCoverImage)(req.file);
        return res
            .status(201)
            .json({
            success: true,
            image: {
                url: image.url,
                publicId: image.publicId,
                width: image.width,
                height: image.height,
            },
        });
    }
    catch (error) {
        console.error("EVENT COVER UPLOAD ERROR:", error);
        return res
            .status(400)
            .json({
            success: false,
            message: error?.message ??
                "Unable to upload event cover.",
        });
    }
}
