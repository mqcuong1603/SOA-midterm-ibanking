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

export const sendPaymentConfirmationEmail = async (userEmail, paymentData) => {
  try {
    const transporter = createTransporter();

    const { transaction, student, payer, newBalance } = paymentData;
    const paymentDate = new Date().toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    // Email content
    const subject = "✅ Payment Confirmation - Tuition Fee Successfully Paid";
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #2c3e50, #3498db); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">✅ Payment Successful!</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your tuition payment has been processed</p>
        </div>

        <!-- Transaction Details -->
        <div style="padding: 30px;">
          <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
            <h2 style="color: #155724; margin: 0 0 15px 0; font-size: 20px;">💰 Transaction Summary</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #155724;">Transaction ID:</td>
                <td style="padding: 8px 0; color: #155724;">#${
                  transaction.id
                }</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #155724;">Amount Paid:</td>
                <td style="padding: 8px 0; color: #155724; font-size: 18px; font-weight: bold;">
                  ${parseInt(transaction.amount).toLocaleString("vi-VN")} VND
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #155724;">Payment Date:</td>
                <td style="padding: 8px 0; color: #155724;">${paymentDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #155724;">Status:</td>
                <td style="padding: 8px 0;">
                  <span style="background-color: #28a745; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">
                    COMPLETED
                  </span>
                </td>
              </tr>
            </table>
          </div>

          <!-- Student Information -->
          <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
            <h3 style="color: #2c3e50; margin: 0 0 15px 0; font-size: 18px;">👨‍🎓 Student Information</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 5px 0; font-weight: bold;">Student ID:</td>
                <td style="padding: 5px 0;">${student.student_id}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; font-weight: bold;">Full Name:</td>
                <td style="padding: 5px 0;">${student.full_name}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; font-weight: bold;">Payment Status:</td>
                <td style="padding: 5px 0;">
                  <span style="color: #28a745; font-weight: bold;">✅ PAID</span>
                </td>
              </tr>
            </table>
          </div>

          <!-- Account Balance -->
          <div style="background-color: #e7f3ff; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
            <h3 style="color: #2c3e50; margin: 0 0 15px 0; font-size: 18px;">💳 Account Balance</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 5px 0; font-weight: bold;">Account Holder:</td>
                <td style="padding: 5px 0;">${payer.full_name}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; font-weight: bold;">Previous Balance:</td>
                <td style="padding: 5px 0;">${parseInt(
                  payer.balance
                ).toLocaleString("vi-VN")} VND</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; font-weight: bold;">Current Balance:</td>
                <td style="padding: 5px 0; font-size: 16px; font-weight: bold; color: #2c3e50;">
                  ${parseInt(newBalance).toLocaleString("vi-VN")} VND
                </td>
              </tr>
            </table>
          </div>

          <!-- Important Notes -->
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
            <h3 style="color: #856404; margin: 0 0 15px 0; font-size: 16px;">📋 Important Information</h3>
            <ul style="color: #856404; margin: 0; padding-left: 20px;">
              <li>Keep this email as proof of payment</li>
              <li>The student's tuition status has been updated to "PAID"</li>
              <li>This transaction is final and cannot be reversed</li>
              <li>For any questions, contact our support team</li>
            </ul>
          </div>

          <!-- Support Information -->
          <div style="text-align: center; padding: 20px 0; border-top: 1px solid #e0e0e0;">
            <p style="color: #6c757d; margin: 0 0 10px 0;">Need help? Contact our support team</p>
            <p style="color: #6c757d; margin: 0; font-size: 14px;">
              📧 Email: support@ibanking.edu.vn | 📞 Phone: 1900-xxxx
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
          <p style="color: #6c757d; font-size: 12px; margin: 0;">
            This is an automated confirmation email from iBanking Tuition Payment System.<br>
            Please do not reply to this email. This email was sent to ${userEmail}
          </p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: `"iBanking System" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: subject,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log(
      "✅ Payment confirmation email sent successfully:",
      info.messageId
    );
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("❌ Payment confirmation email failed:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};

export default { sendOTPEmail, sendPaymentConfirmationEmail };
