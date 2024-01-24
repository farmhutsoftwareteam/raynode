# CSV Upload API Documentation

The CSV Upload API provided by Raysun Capital allows clients to securely upload two types of CSV files: loan-related and customer-related. These files are stored in designated directories and are named to include the current date, facilitating easy identification and management.

## API Endpoint

### Upload CSV

**POST** `/upload-csv`

This endpoint is designed to handle `multipart/form-data` requests and accepts two separate fields for CSV files.

#### Base URL
https://raysuncapital.azurewebsites.net


#### Parameters

- `loanCsv`: A CSV file containing loan data. This field is optional.
- `customersCsv`: A CSV file containing customer data. This field is also optional.

#### Request Example

To upload files using `curl`, you can use the following command:

sh
curl -X POST -H "Content-Type: multipart/form-data" \
-F "loanCsv=@/path/to/loan.csv" \
-F "customersCsv=@/path/to/customers.csv" \
https://raysuncapital.azurewebsites.net/upload-csv


Replace `/path/to/loan.csv` and `/path/to/customers.csv` with the actual file paths of your CSV files.

#### Responses

##### Success Response

- **Code**: `200 OK`
- **Content**: `"Files uploaded successfully"`

##### Error Response

- **Code**: `500 Internal Server Error`
- **Content**: `"Error uploading files: [error message]"`

## File Storage

Upon successful upload, files are stored in the server's file system within the `uploads` directory. There are two subdirectories:

- `loans`: This directory stores the loan CSV files.
- `customers`: This directory stores the customer CSV files.

The filenames are prefixed with the current date in the format `YYYY-MM-DD`, followed by a unique timestamp and the original filename, ensuring that files are not overwritten and a clear upload history is maintained.

## Notes

- Ensure that the server has the necessary write permissions to the `uploads` directory.
- The maximum file size and other upload constraints can be configured in the server settings.
- For any issues or support, please contact the Raysun Capital technical team.