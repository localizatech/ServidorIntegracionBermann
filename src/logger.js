const log4js = require("log4js");

const LOG_DIRECTORY = process.env.LOG_DIRECTORY || "logs";

log4js.configure({
  appenders: {
    bermann: {
      type: "file",
      filename: `${LOG_DIRECTORY}/servidor-integracion-bermann.log`,
      maxLogSize: 5 * 1024 * 1024,
      backups: 10,
      compress: false,
      layout: {
        type: "pattern",
        pattern: "%d{yyyy-MM-dd hh:mm:ss} %p %f{1}:%l %m",
      },
    },
    console: { type: "stdout" }
  },
  categories: {
    default: {
      appenders: ["bermann", "console"],
      level: process.env.LOG_LEVEL || "info",
      enableCallStack: true,
    },
  },
});

module.exports = log4js.getLogger();
