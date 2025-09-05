import nodemailer from "nodemailer";

//email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

export const sendOTPEmail = async (userEmail, otpCode, studentInfo = null) => {
  try {
    const transporter = createTransporter();

    // Email content
    const subject = "Banking System - OTP Verification Code";
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">iBanking Tuition Payment System</h2>
        <h3 style="color: #3498db;">OTP Verification Code</h3>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Your OTP Code:</strong></p>
          <h1 style="color: #e74c3c; font-size: 32px; letter-spacing: 5px; text-align: center; margin: 20px 0;">
            ${otpCode}
          </h1>
        </div>
        
        ${
          studentInfo
            ? `
        <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Payment Details:</strong></p>
          <p>Student: ${studentInfo.full_name} (${studentInfo.student_id})</p>
          <p>Tuition Amount: ${parseInt(
            studentInfo.tuition_amount
          ).toLocaleString("vi-VN")} VND</p>
        </div>
        `
            : ""
        }
        
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>⚠️ Security Notice:</strong></p>
          <ul>
            <li>This code expires in <strong>5 minutes</strong></li>
            <li>Never share this code with anyone</li>
            <li>Use this code only in the official banking application</li>
          </ul>
        </div>
        
        <p style="color: #6c757d; font-size: 12px; margin-top: 30px;">
          This is an automated message from iBanking System. Please do not reply to this email.
        </p>
      </div>
    `;

    const mailOptions = {
      from: `"iBanking System" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: subject,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("✅ Email sent successfully:", info.messageId);
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("❌ Email sending failed:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};

export default { sendOTPEmail };
