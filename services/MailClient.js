const axios = require("axios")

const logger = require("@logger/logger")

const { POSTMAN_API_KEY } = process.env
const POSTMAN_API_URL = "https://api.postman.gov.sg/v1"

class MailClient {
  async sendMail(recipient, body) {
    if (!POSTMAN_API_KEY)
      throw new Error("Postman.gov.sg API key cannot be empty.")

    const endpoint = `${POSTMAN_API_URL}/transactional/email/send`
    const email = {
      subject: "One-Time Password (OTP) for IsomerCMS",
      from: "IsomerCMS <donotreply@mail.postman.gov.sg>",
      body,
      recipient,
    }

    try {
      await axios.post(endpoint, email, {
        headers: {
          Authorization: `Bearer ${POSTMAN_API_KEY}`,
        },
      })
    } catch (err) {
      logger.error(err)
      throw new Error("Failed to send email.")
    }
  }
}

module.exports = MailClient