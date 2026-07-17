"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = create;
exports.me = me;
exports.update = update;
const attendee_profile_service_1 = require("./attendee-profile.service");
/*
|--------------------------------------------------------------------------
| Create Profile
|--------------------------------------------------------------------------
*/
async function create(req, res) {
    try {
        const profile = await (0, attendee_profile_service_1.createProfile)(req.user.userId, {
            profession: req.body.profession,
            industry: req.body.industry,
            company: req.body.company,
            jobTitle: req.body.jobTitle,
            linkedin: req.body.linkedin,
            goals: req.body.goals,
            skills: req.body.skills,
            bio: req.body.bio,
        });
        return res.status(201).json({
            success: true,
            profile,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}
/*
|--------------------------------------------------------------------------
| My Profile
|--------------------------------------------------------------------------
*/
async function me(req, res) {
    try {
        const profile = await (0, attendee_profile_service_1.getMyProfile)(req.user.userId);
        return res.json({
            success: true,
            profile,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}
/*
|--------------------------------------------------------------------------
| Update Profile
|--------------------------------------------------------------------------
*/
async function update(req, res) {
    try {
        const profile = await (0, attendee_profile_service_1.updateProfile)(req.user.userId, {
            profession: req.body.profession,
            industry: req.body.industry,
            company: req.body.company,
            jobTitle: req.body.jobTitle,
            linkedin: req.body.linkedin,
            goals: req.body.goals,
            skills: req.body.skills,
            bio: req.body.bio,
        });
        return res.json({
            success: true,
            profile,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}
