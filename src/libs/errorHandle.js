export class AppError extends Error {
  statusCode;

  constructor(message, statusCode) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;

    Object.setPrototypeOf(this, AppError.prototype);
  }
}
