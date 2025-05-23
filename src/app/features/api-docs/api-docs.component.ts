import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-api-docs',
  imports: [CommonModule],
  templateUrl: './api-docs.component.html',
  styleUrl: './api-docs.component.scss'
})
export class ApiDocsComponent implements OnInit {
 endpoints = [
    {
      id: 'authentication',
      title: 'Authentication Method',
      sections: [
        {
          id: 'requirements',
          title: 'What do I need to use the affiliate API?',
          content: 'To use the affiliate API, <strong>HTTP Basic Auth</strong> is required. You will need to know the unique credentials<sup>1</sup> of your business to enter the system. These credentials consist of two parameters, <code>client_id</code>, and <code>client_secret</code>, used as the username and password for business authentication.',
        },
        {
          id: 'credentials',
          title: 'How to obtain the credentials for entering the business system?',
          content: 'Upon registering a company as a business in the banking system and providing all the necessary data, the system provides the credentials <code>client_id</code> and <code>client_secret</code> necessary to enter the system. These credentials are unique identifiers of the business. It is impermissible to disclose or transfer the <code>client_secret</code> parameter to another person. Doing so significantly increases the probability of a security breach. The business cannot change the <code>client_secret</code> parameter.'
        },
        {
          id: 'method-description',
          title: 'Method description',
          content: 'This method allows businesses to undergo the authentication process. Upon calling the API, the online payment server returns the <code>Bearer Token</code>, which is the necessary authentication parameter for calling all further methods.',
          curl: {
            title: 'CURL',
            code: `curl -X POST 'https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token' \\
-u {client_id}:{client_secret} \\
-H 'Content-Type: application/x-www-form-urlencoded' \\
--data-urlencode 'grant_type=client_credentials'`
          },
          headers: [
            {
              name: 'Content-Type',
              required: true,
              value: 'application/x-www-form-urlencoded'
            },
            {
              name: 'Authorization',
              required: true,
              value: 'Basic <base64>'
            }
          ],
          additionalInfo: '"Basic" + "<client_id>:<secret_key>" encoded in the Base64 format is transmitted as a value (e.g., "Basic ODI4Mjo3Njk3MDY0OTlmMDcwOWUyMzQ4NDU4NjNmOThiMjMxNA=="), where <client_id> and <secret_key> are the credentials necessary to enter the system, transmitted by the bank to the business.'
        }
      ]
    },
    {
      id: 'transaction-create',
      title: 'Create Transaction',
      sections: [
        {
          id: 'transaction-requirements',
          title: 'How to create a transaction?',
          content: 'To create a transaction, you must be authenticated and include your Bearer Token in the header. The transaction endpoint allows affiliates to initiate payment transactions for their customers.',
        },
        {
          id: 'transaction-method',
          title: 'Method description',
          content: 'This method allows affiliates to create new payment transactions. Upon successful creation, the API returns a transaction ID that can be used to track the status of the payment.',
          curl: {
            title: 'CURL',
            code: `curl -X POST 'https://api.example.com/v1/transactions' \\
-H 'Authorization: Bearer {your_token}' \\
-H 'Content-Type: application/json' \\
-d '{
  "amount": 100.00,
  "currency": "GEL",
  "description": "Payment for services",
  "customer_id": "cust_12345",
  "redirect_url": "https://your-website.com/success"
}'`
          },
          headers: [
            {
              name: 'Content-Type',
              required: true,
              value: 'application/json'
            },
            {
              name: 'Authorization',
              required: true,
              value: 'Bearer {token}'
            }
          ],
          additionalInfo: 'The Bearer token is obtained through the authentication method described above. This token has an expiration time, so you might need to request a new one if your token has expired.'
        }
      ]
    },
    {
      id: 'transaction-status',
      title: 'Check Transaction Status',
      sections: [
        {
          id: 'status-requirements',
          title: 'How to check a transaction status?',
          content: 'To check a transaction status, you need the transaction ID that was returned when creating the transaction. This endpoint allows affiliates to monitor the payment process.',
        },
        {
          id: 'status-method',
          title: 'Method description',
          content: 'This method allows businesses to check the status of existing transactions. The API returns the current status of the transaction and additional details if available.',
          curl: {
            title: 'CURL',
            code: `curl -X GET 'https://api.example.com/v1/transactions/{transaction_id}' \\
-H 'Authorization: Bearer {your_token}'`
          },
          headers: [
            {
              name: 'Authorization',
              required: true,
              value: 'Bearer {token}'
            }
          ],
          additionalInfo: 'Possible transaction statuses include: PENDING, COMPLETED, FAILED, and REFUNDED. Each status comes with additional information about the transaction.'
        }
      ]
    }
  ];

  ngOnInit(): void { }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      // You could add a toast notification here
      console.log('Copied to clipboard');
    });
  }
}
