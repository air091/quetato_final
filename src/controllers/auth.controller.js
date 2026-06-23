const loginController = async (request, response) => {
  try {
    const { email, password } = request.body;
    const agent = request.headers["user-agent"] || "Unknown Device";
    const ipAddress = request.ip || "127.0.0.1";

    const tokens = await login(email, password, agent, ipAddress);
    const response = NextResponse.json(
      { success: true, tokens },
      { status: 200 },
    );

    response.cookie("token", tokens.refresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 1000 * 60 * 60 * 24 * 7,
      path: "/",
    });

    return response.status(200).json({ success: true, tokens });
  } catch (error) {
    console.error("Login failed", error);

    let errMessage = "Server Internal Error";
    let statusCode = 500;

    if (error instanceof Error) {
      errMessage = error.errMessage;
      statusCode = error.statusCode;
    }
    return response
      .status(statusCode)
      .json({ success: false, message: errMessage });
  }
};
