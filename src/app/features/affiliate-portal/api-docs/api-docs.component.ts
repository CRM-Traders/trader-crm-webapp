import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';

interface Header {
  name: string;
  required: boolean;
  value: string;
}

interface CurlExample {
  title: string;
  code: string;
}

interface Section {
  id: string;
  title: string;
  content: string;
  curl?: CurlExample;
  headers?: Header[];
  additionalInfo?: string;
}

interface Endpoint {
  id: string;
  title: string;
  sections: Section[];
}

@Component({
  selector: 'app-api-docs',
  imports: [CommonModule],
  templateUrl: './api-docs.component.html',
  styleUrl: './api-docs.component.scss',
})
export class ApiDocsComponent implements OnInit {
  @ViewChild('documentationContent', { static: false })
  documentationContent!: ElementRef;
  endpoints: Endpoint[] = [
    {
      id: 'overview',
      title: 'API Overview',
      sections: [
        {
          id: 'introduction',
          title: 'Introduction',
          content:
            'The Client Management API provides programmatic access to create and manage client accounts within our system. This RESTful API enables affiliate partners to seamlessly onboard new clients through automated workflows, ensuring secure and efficient account creation processes.',
        },
        {
          id: 'base-url',
          title: 'Base URL',
          content: 'All API requests should be made to the following base URL:',
          curl: {
            title: 'Production Environment',
            code: 'https://localhost:7156/api',
          },
          additionalInfo:
            'Please ensure you are using HTTPS for all API communications to maintain security standards. The API supports both development and production environments with separate base URLs.',
        },
        {
          id: 'authentication',
          title: 'Authentication',
          content:
            'The API uses secret key authentication to ensure secure access. Every request must include a valid secret key in the request headers. This authentication method provides a balance between security and ease of implementation for server-to-server communications.',
          headers: [
            {
              name: 'X-Secret-Key',
              required: true,
              value: 'your-secret-key-here',
            },
          ],
          additionalInfo:
            '<strong>Important Security Notice:</strong> Your secret key provides full access to your API account. Store it securely and never expose it in client-side code, public repositories, or unsecured communications. If you suspect your key has been compromised, contact support immediately for key rotation.',
        },
      ],
    },
    {
      id: 'insert-clients',
      title: 'Insert Clients Endpoint',
      sections: [
        {
          id: 'endpoint-overview',
          title: 'Endpoint Overview',
          content:
            'The Insert Clients endpoint enables the creation of one or multiple client accounts in a single API call. This endpoint is designed for efficient bulk operations while maintaining data integrity and validation for each client record.',
          curl: {
            title: 'Endpoint URL',
            code: 'POST https://localhost:7156/api/clients/insert-clients',
          },
        },
        {
          id: 'request-format',
          title: 'Request Format',
          content:
            'The endpoint accepts a JSON payload containing an array of client objects. Each client object represents an individual account to be created. The system validates each client record independently, allowing partial success in bulk operations.',
          curl: {
            title: 'Request Example',
            code: `curl https://localhost:7156/api/clients/insert-clients \\
  --request POST \\
  --header 'Content-Type: application/json' \\
  --header 'X-Secret-Key: your-secret-key-here' \\
  --data '{
  "clients": [
    {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "username": "johndoe123",
      "affiliateId": "aff-123456",
      "telephone": "+1234567890",
      "country": "US",
      "language": "en",
      "dateOfBirth": "1990-01-15",
      "source": "web-referral"
    }
  ]
}'`,
          },
          headers: [
            {
              name: 'Content-Type',
              required: true,
              value: 'application/json',
            },
            {
              name: 'X-Secret-Key',
              required: true,
              value: 'your-secret-key-here',
            },
          ],
        },
        {
          id: 'request-parameters',
          title: 'Request Parameters',
          content:
            'The request body must contain a <code>clients</code> array with one or more client objects. Each client object supports the following fields:',
          additionalInfo: `<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <thead class="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">Field</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">Type</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">Required</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">Description</th>
              </tr>
            </thead>
            <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              <tr>
                <td class="px-4 py-3 text-sm font-mono text-gray-700 dark:text-gray-300">firstName</td>
                <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">string</td>
                <td class="px-4 py-3 text-sm"><span class="px-2 py-1 text-xs font-medium bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 rounded">Required</span></td>
                <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">Client's first name</td>
              </tr>
              <tr>
                <td class="px-4 py-3 text-sm font-mono text-gray-700 dark:text-gray-300">lastName</td>
                <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">string</td>
                <td class="px-4 py-3 text-sm"><span class="px-2 py-1 text-xs font-medium bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 rounded">Required</span></td>
                <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">Client's last name</td>
              </tr>
              <tr>
                <td class="px-4 py-3 text-sm font-mono text-gray-700 dark:text-gray-300">email</td>
                <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">string</td>
                <td class="px-4 py-3 text-sm"><span class="px-2 py-1 text-xs font-medium bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 rounded">Required</span></td>
                <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">Valid email address (must be unique)</td>
              </tr>
              <tr>
                <td class="px-4 py-3 text-sm font-mono text-gray-700 dark:text-gray-300">username</td>
                <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">string</td>
                <td class="px-4 py-3 text-sm"><span class="px-2 py-1 text-xs font-medium bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 rounded">Required</span></td>
                <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">Unique username for the client</td>
              </tr>
              <tr>
                <td class="px-4 py-3 text-sm font-mono text-gray-700 dark:text-gray-300">affiliateId</td>
                <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">string</td>
                <td class="px-4 py-3 text-sm"><span class="px-2 py-1 text-xs font-medium bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 rounded">Required</span></td>
                <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">ID of the referring affiliate</td>
              </tr>
              <tr>
                <td class="px-4 py-3 text-sm font-mono text-gray-700 dark:text-gray-300">telephone</td>
                <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">string | null</td>
                <td class="px-4 py-3 text-sm"><span class="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">Optional</span></td>
                <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">Contact phone number</td>
              </tr>
              <tr>
                <td class="px-4 py-3 text-sm font-mono text-gray-700 dark:text-gray-300">country</td>
                <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">string | null</td>
                <td class="px-4 py-3 text-sm"><span class="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">Optional</span></td>
                <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">ISO 3166-1 alpha-2 country code</td>
              </tr>
              <tr>
                <td class="px-4 py-3 text-sm font-mono text-gray-700 dark:text-gray-300">language</td>
                <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">string | null</td>
                <td class="px-4 py-3 text-sm"><span class="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">Optional</span></td>
                <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">Preferred language code (e.g., "en", "es")</td>
              </tr>
              <tr>
                <td class="px-4 py-3 text-sm font-mono text-gray-700 dark:text-gray-300">dateOfBirth</td>
                <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">string | null</td>
                <td class="px-4 py-3 text-sm"><span class="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">Optional</span></td>
                <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">Date in YYYY-MM-DD format</td>
              </tr>
              <tr>
                <td class="px-4 py-3 text-sm font-mono text-gray-700 dark:text-gray-300">source</td>
                <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">string | null</td>
                <td class="px-4 py-3 text-sm"><span class="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">Optional</span></td>
                <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">Client acquisition source</td>
              </tr>
            </tbody>
          </table>`,
        },
        {
          id: 'response-format',
          title: 'Success Response',
          content:
            'Upon successful client creation, the API returns a 200 OK status with details about the created account. The response includes system-generated identifiers and a secure password for the new client account.',
          curl: {
            title: 'Response Example (200 OK)',
            code: `{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "generatedPassword": "Secure#Pass123!",
  "clientId": "123e4567-e89b-12d3-a456-426614174000",
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "affiliateId": "aff-123456"
}`,
          },
          additionalInfo:
            '<strong>Security Note:</strong> The <code>generatedPassword</code> field contains a system-generated secure password for the client. This password should be securely transmitted to the client through appropriate channels. The password follows strong security requirements including uppercase letters, lowercase letters, numbers, and special characters.',
        },
        {
          id: 'error-handling',
          title: 'Error Handling',
          content:
            'The API provides detailed error responses to help diagnose issues with client creation. Common error scenarios include validation failures, duplicate accounts, and authentication errors.',
          additionalInfo: `<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <thead class="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">Status Code</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">Description</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">Common Causes</th>
              </tr>
            </thead>
            <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              <tr>
                <td class="px-4 py-3 text-sm font-mono text-gray-700 dark:text-gray-300">400</td>
                <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">Bad Request</td>
                <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">Invalid JSON format, missing required fields, or validation errors</td>
              </tr>
              <tr>
                <td class="px-4 py-3 text-sm font-mono text-gray-700 dark:text-gray-300">401</td>
                <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">Unauthorized</td>
                <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">Missing or invalid X-Secret-Key header</td>
              </tr>
              <tr>
                <td class="px-4 py-3 text-sm font-mono text-gray-700 dark:text-gray-300">409</td>
                <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">Conflict</td>
                <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">Email or username already exists in the system</td>
              </tr>
              <tr>
                <td class="px-4 py-3 text-sm font-mono text-gray-700 dark:text-gray-300">500</td>
                <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">Internal Server Error</td>
                <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">Unexpected server error; contact support if persistent</td>
              </tr>
            </tbody>
          </table>`,
        },
      ],
    },
    {
      id: 'best-practices',
      title: 'Best Practices',
      sections: [
        {
          id: 'implementation-guidelines',
          title: 'Implementation Guidelines',
          content:
            'Following these best practices ensures optimal performance, security, and reliability when integrating with the Client Management API. These guidelines are based on industry standards and our platform-specific optimizations.',
        },
        {
          id: 'security-considerations',
          title: 'Security Considerations',
          content:
            'Maintaining security is paramount when handling client data and authentication credentials. Implement these security measures to protect sensitive information:',
          additionalInfo: `<ul class="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>Secure Storage:</strong> Store your API secret key in environment variables or secure key management systems, never in source code</li>
            <li><strong>HTTPS Only:</strong> Always use HTTPS connections to prevent man-in-the-middle attacks</li>
            <li><strong>Password Handling:</strong> Immediately transmit generated passwords to clients through secure channels and encourage password changes upon first login</li>
            <li><strong>Rate Limiting:</strong> Implement appropriate rate limiting to prevent abuse and ensure fair usage</li>
            <li><strong>Audit Logging:</strong> Maintain logs of all API calls for security auditing and troubleshooting</li>
          </ul>`,
        },
        {
          id: 'data-validation',
          title: 'Data Validation',
          content:
            'Proper data validation before API submission reduces errors and improves success rates. Implement client-side validation for these common requirements:',
          additionalInfo: `<ul class="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>Email Format:</strong> Validate email addresses against RFC 5322 standards</li>
            <li><strong>Username Rules:</strong> Ensure usernames meet length requirements (typically 3-20 characters) and contain only allowed characters</li>
            <li><strong>Date Formats:</strong> Use ISO 8601 date format (YYYY-MM-DD) for dateOfBirth field</li>
            <li><strong>Country Codes:</strong> Validate against ISO 3166-1 alpha-2 country code standards</li>
            <li><strong>Phone Numbers:</strong> Consider using E.164 format for international compatibility</li>
          </ul>`,
        },
        {
          id: 'error-recovery',
          title: 'Error Recovery Strategies',
          content:
            'Implement robust error handling to gracefully manage API failures and provide excellent user experience:',
          additionalInfo: `<ul class="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>Retry Logic:</strong> Implement exponential backoff for transient errors (5xx status codes)</li>
            <li><strong>Idempotency:</strong> Design your integration to handle duplicate submissions gracefully</li>
            <li><strong>Partial Success:</strong> When submitting multiple clients, handle scenarios where some succeed and others fail</li>
            <li><strong>User Feedback:</strong> Provide clear error messages to end users based on API error responses</li>
            <li><strong>Monitoring:</strong> Set up alerts for API failures to quickly identify and resolve issues</li>
          </ul>`,
        },
      ],
    },
  ];

  ngOnInit(): void {}

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {});
  }

  printDocumentation(): void {
    // Get the documentation content
    const content = this.documentationContent.nativeElement;

    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');

    if (!printWindow) {
      alert('Please allow pop-ups to enable PDF export functionality.');
      return;
    }

    // Create the complete HTML document for printing
    const printDocument = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Client Management API Documentation</title>
        <style>
          /* Print-specific styles */
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }

          @page {
            margin: 1in;
            size: A4;
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 12pt;
            line-height: 1.5;
            color: #000;
            background: #fff;
          }

          h1 {
            font-size: 20pt;
            font-weight: bold;
            margin-bottom: 16pt;
            page-break-after: avoid;
            border-bottom: 2pt solid #000;
            padding-bottom: 8pt;
          }

          h2 {
            font-size: 16pt;
            font-weight: bold;
            margin-top: 20pt;
            margin-bottom: 12pt;
            page-break-after: avoid;
            color: #000;
          }

          h3 {
            font-size: 14pt;
            font-weight: bold;
            margin-top: 16pt;
            margin-bottom: 8pt;
            page-break-after: avoid;
            color: #000;
          }

          h4 {
            font-size: 12pt;
            font-weight: bold;
            margin-top: 12pt;
            margin-bottom: 6pt;
            page-break-after: avoid;
            color: #000;
          }

          p, div {
            margin-bottom: 8pt;
            line-height: 1.5;
            color: #000;
            orphans: 3;
            widows: 3;
          }

          pre, code {
            background: #f8f8f8;
            border: 1px solid #ddd;
            font-family: 'Courier New', Monaco, monospace;
            font-size: 10pt;
            padding: 8pt;
            margin: 8pt 0;
            page-break-inside: avoid;
            white-space: pre-wrap;
            word-wrap: break-word;
            overflow: visible;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin: 12pt 0;
            page-break-inside: avoid;
            font-size: 10pt;
          }

          th, td {
            border: 1px solid #333;
            padding: 6pt;
            text-align: left;
            vertical-align: top;
          }

          th {
            background: #f0f0f0;
            font-weight: bold;
          }

          ul, ol {
            margin: 8pt 0;
            padding-left: 20pt;
          }

          li {
            margin-bottom: 4pt;
          }

          .section-break {
            margin-bottom: 20pt;
            page-break-inside: avoid;
          }

          /* Hide any buttons or interactive elements */
          button, .copy-button, .navigation {
            display: none !important;
          }

          /* Ensure proper spacing */
          .endpoint-section {
            margin-bottom: 24pt;
            page-break-inside: avoid;
          }

          .code-block {
            background: #f8f8f8;
            border: 1px solid #ddd;
            padding: 8pt;
            margin: 8pt 0;
            page-break-inside: avoid;
          }

          /* Badge styling for print */
          .badge {
            background: #f0f0f0 !important;
            border: 1px solid #ccc !important;
            color: #000 !important;
            padding: 2pt 4pt;
            font-size: 9pt;
            font-weight: bold;
          }

          /* Additional info boxes */
          .info-box {
            background: #fafafa;
            border: 1px solid #e0e0e0;
            padding: 8pt;
            margin: 8pt 0;
            page-break-inside: avoid;
          }

          /* Strong emphasis */
          strong, b {
            font-weight: bold;
            color: #000;
          }

          /* Links */
          a {
            color: #000;
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        ${content.innerHTML}
      </body>
      </html>
    `;

    // Write the document to the new window
    printWindow.document.write(printDocument);
    printWindow.document.close();

    // Wait for the content to load, then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    };
  }
}
