const nodemailer = require('nodemailer');

async function testEmail() {
  console.log('🧪 Testing Email Configuration...\n');

  // Email configuration
  const config = {
    host: 'mail.coreskool.xyz',
    port: 465,
    secure: true,
    auth: {
      user: 'support@coreskool.xyz',
      pass: 'ysa+ty}=vm9Se_Jd',
    },
  };

  console.log('📧 Email Config:');
  console.log(`   Host: ${config.host}`);
  console.log(`   Port: ${config.port}`);
  console.log(`   Secure: ${config.secure}`);
  console.log(`   User: ${config.auth.user}`);
  console.log(`   Pass: ${'*'.repeat(config.auth.pass.length)}\n`);

  // Create transporter
  console.log('🔧 Creating transporter...');
  const transporter = nodemailer.createTransport(config);

  // Test 1: Verify connection
  console.log('\n📡 Test 1: Verifying connection...');
  try {
    await transporter.verify();
    console.log('✅ Connection verified successfully!\n');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }

  // Test 2: Send test email
  const testEmail = process.argv[2] || 'test@example.com';
  console.log(`📨 Test 2: Sending test email to ${testEmail}...`);
  
  try {
    const info = await transporter.sendMail({
      from: '"Solcial Test" <support@coreskool.xyz>',
      to: testEmail,
      subject: 'Test Email from Solcial - ' + new Date().toLocaleString(),
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Test Email</title>
          </head>
          <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h1 style="color: #9333ea; margin-bottom: 20px;">✅ Email Test Successful!</h1>
              <p style="color: #666; font-size: 16px; line-height: 1.6;">
                This is a test email from your Solcial backend. If you're reading this, your email configuration is working correctly!
              </p>
              <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #666;"><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
                <p style="margin: 10px 0 0 0; color: #666;"><strong>From:</strong> support@coreskool.xyz</p>
                <p style="margin: 10px 0 0 0; color: #666;"><strong>To:</strong> ${testEmail}</p>
              </div>
              <p style="color: #999; font-size: 14px; margin-top: 30px;">
                This is an automated test email. No action is required.
              </p>
            </div>
          </body>
        </html>
      `,
      text: `
        Email Test Successful!
        
        This is a test email from your Solcial backend.
        If you're reading this, your email configuration is working correctly!
        
        Sent at: ${new Date().toLocaleString()}
        From: support@coreskool.xyz
        To: ${testEmail}
      `,
    });

    console.log('✅ Email sent successfully!');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Response: ${info.response}\n`);
    
    console.log('🎉 All tests passed! Email is working correctly.');
    console.log(`\n💡 Check your inbox at ${testEmail} for the test email.`);
    
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Run the test
testEmail().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
