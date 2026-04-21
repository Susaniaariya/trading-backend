const User = require("../model/UserModel");
module.exports.awardPoints = async (req, res) => {
  try {
    const { pointsToAward, lessonId } = req.body;

    // 1. Get the user ID from the verified request
    const userId = req.user._id;

    // 2. Use findById to get the actual Mongoose document
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    // 3. Check for existing progress
    if (user.completedLessons.includes(lessonId)) {
      return res.status(400).json({
        status: false,
        message: "You've already earned points for this lesson! 🌸",
      });
    }

    // 4. Update and Save
    user.points += pointsToAward;
    user.completedLessons.push(lessonId);
    await user.save();

    res.status(200).json({
      status: true,
      message: "Points added!",
      points: user.points,
      completedLessons: user.completedLessons,
    });
  } catch (error) {
    console.error("AwardPoints Error:", error);
    res.status(500).json({ status: false, message: "Server error" });
  }
};

module.exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("points completedLessons");
    if (!user) return res.status(404).json({ status: false, message: "User not found" });

    res.status(200).json({
      points: user.points,
      completedLessons: user.completedLessons,
    });
  } catch (error) {
    console.error("GetMe Error:", error);
    res.status(500).json({ status: false, message: "Server error" });
  }
};