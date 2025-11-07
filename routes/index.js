const userRoutes = require("./user.routes");
const authRoutes = require("./auth.routes");
const postRoutes = require("./posts.routes");


module.exports = function (app) {
  app.use("/api/user", userRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/posts", postRoutes);

};
