const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const logger = require("morgan");
require("colors");
const cron = require("node-cron");

const connectDB = require("./config/db");

dotenv.config();
connectDB();
const app = express();

const corsOptions = {
  origin: (origin, callback) => {
    callback(null, origin);
  },
  credentials: true,
};
app.use(cors(corsOptions));
app.use(logger("dev"));
app.use(express.urlencoded({ extended: true })); // For parsing URL-encoded bodies
app.use(express.json()); // For parsing JSON bodies
app.use(helmet());

let apiRouter = require('./routes');
apiRouter(app);

app.get("/", (req, res) => {
  return res.status(200).send("EDIT Server is running successfully!");
});



app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  // res.locals.message = err.message;
  // res.locals.error = req.app.get('env') === 'development' ? err : {};
  // console.log(err.message);
  // logger.error({
  //   message: err.message,
  //   method: req.method,
  //   url: req.originalUrl,
  //   ip: req.ip,
  //   stack: err.stack
  // });
  console.log(err);
  // render the error page
  res.status(err.status || 500);
  // res.render('error');
  res.json({
		status: false,
    message: err.message,
    data: null,
	});
});

const PORT = process.env.PORT;

app.listen(PORT, async () => {
  console.log(`Server running on PORT ${PORT}...`.yellow.bold);

});
