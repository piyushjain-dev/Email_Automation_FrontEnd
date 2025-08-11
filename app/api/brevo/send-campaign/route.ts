import { NextRequest, NextResponse } from 'next/server'

// Brevo API configuration
const BREVO_API_KEY = process.env.BREVO_API_KEY
const BREVO_API_URL = 'https://api.brevo.com/v3'

export async function POST(request: NextRequest) {
  try {
    const campaignData = await request.json()
    const { sender, campaign, emails } = campaignData

    console.log('📧 Campaign activation request:', { sender, campaign, emailsCount: emails?.length })

    // Validate required fields
    if (!sender?.name || !sender?.email || !campaign?.name || !emails || emails.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Step 1: Create contacts in Brevo
    const contacts = emails.map((email: any) => ({
      email: email.email, // Use email.email instead of email.recipient
      attributes: {
        FIRSTNAME: email.first_name || '',
        LASTNAME: email.last_name || '',
        COMPANY: email.company_name || ''
      }
    }))

    console.log('📧 Creating contacts:', contacts)

    const contactsResponse = await fetch(`${BREVO_API_URL}/contacts/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY
      },
      body: JSON.stringify({
        contacts: contacts,
        updateEnabled: false
      })
    })

    if (!contactsResponse.ok) {
      const errorData = await contactsResponse.json()
      console.error('Brevo contacts error:', errorData)
      
      // If it's a "document_not_found" error, try creating contacts individually
      if (errorData.code === 'document_not_found') {
        console.log('🔄 Trying to create contacts individually...')
        
        const individualContactPromises = contacts.map(async (contact: any) => {
          try {
            const response = await fetch(`${BREVO_API_URL}/contacts`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'api-key': BREVO_API_KEY
              },
              body: JSON.stringify(contact)
            })
            return response.ok
          } catch (error) {
            console.error('Error creating individual contact:', error)
            return false
          }
        })
        
        await Promise.all(individualContactPromises)
        console.log('✅ Contacts created individually')
      } else {
        return NextResponse.json(
          { error: `Failed to create contacts in Brevo: ${errorData.message || errorData.code}` },
          { status: 500 }
        )
      }
    } else {
      console.log('✅ Contacts created successfully in batch')
    }

    // Step 2: Send emails directly using Brevo's transactional API
    const sendPromises = emails.map(async (email: any) => {
      const sequence = email.sequence
      const results = []

      console.log(`📧 Sending emails for ${email.email}, sequence keys:`, Object.keys(sequence || {}))

      for (let i = 1; i <= 8; i++) {
        const subject = sequence[`Email_${i}_Subject`]
        const body = sequence[`Email_${i}`]

        if (subject && body) {
          const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <title>${subject}</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                ${body.replace(/\n/g, '<br>')}
              </div>
            </body>
            </html>
          `

          const sendResponse = await fetch(`${BREVO_API_URL}/smtp/email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'api-key': BREVO_API_KEY
            },
            body: JSON.stringify({
              to: [{ email: email.email }], // Use email.email instead of email.recipient
              sender: {
                name: sender.name,
                email: sender.email
              },
              subject: subject,
              htmlContent: htmlContent
            })
          })

          if (sendResponse.ok) {
            const responseData = await sendResponse.json()
            results.push({
              email: email.email,
              emailNumber: i,
              success: true,
              messageId: responseData.messageId
            })
            console.log(`✅ Email ${i} sent successfully to ${email.email}`)
          } else {
            const errorData = await sendResponse.json()
            results.push({
              email: email.email,
              emailNumber: i,
              success: false,
              error: errorData.message || 'Failed to send email'
            })
            console.error(`❌ Failed to send email ${i} to ${email.email}:`, errorData)
          }
        } else {
          console.log(`⚠️ Missing subject or body for email ${i} to ${email.email}`)
        }
      }

      return results
    })

    const allResults = await Promise.all(sendPromises)
    const flatResults = allResults.flat()
    const successfulSends = flatResults.filter(result => result.success)
    const failedSends = flatResults.filter(result => !result.success)

    return NextResponse.json({
      success: true,
      message: 'Campaign activated successfully',
      summary: {
        totalEmails: flatResults.length,
        successful: successfulSends.length,
        failed: failedSends.length,
        campaignName: campaign.name,
        sender: sender
      },
      results: flatResults
    })

  } catch (error) {
    console.error('Campaign activation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 