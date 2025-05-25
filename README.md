# Extent Report Comparator

A web application to compare multiple Extent reports and analyze test results.

## Quick Start with Docker (Recommended)

1. Install Docker and Docker Compose on your system:
   - Windows/Mac: Install [Docker Desktop](https://www.docker.com/products/docker-desktop/)
   - Linux: Install [Docker Engine](https://docs.docker.com/engine/install/) and [Docker Compose](https://docs.docker.com/compose/install/)

2. Clone the repository:
   ```bash
   git clone https://github.com/sampurn31/extent_report_compartor.git
   cd extent_report_compartor
   ```

3. Start the application:
   ```bash
   docker-compose up
   ```

4. Open http://localhost:3000 in your browser

That's it! The application is now running and ready to use.

To stop the application:
```bash
docker-compose down
```

## Manual Setup (Alternative)

If you prefer not to use Docker, you can set up the application manually:

### Backend Setup

1. Install Python 3.11 or later
2. Create a virtual environment:
   ```bash
   python -m venv venv
   ```
3. Activate the virtual environment:
   - Windows:
     ```bash
     .\venv\Scripts\activate
     ```
   - Linux/Mac:
     ```bash
     source venv/bin/activate
     ```
4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
5. Run the Flask application:
   ```bash
   python app.py
   ```
   The backend will run on http://localhost:5000

### Frontend Setup

1. Install Node.js 18 or later
2. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm start
   ```
   The frontend will run on http://localhost:3000

## Usage

1. Open http://localhost:3000 in your browser
2. Select the Extent report HTML files you want to compare
3. Click "Upload and Analyze"
4. View the comparison results:
   - Common failing tests
   - Tests sorted by failure count
   - Tests sorted by failure rate
5. Use the search feature to find specific tests

## Features

- Compare multiple Extent reports
- Analyze test failures across reports
- Search for specific tests
- Sort tests by failure count or rate
- View detailed test status for each report
- No file size restrictions
- Fast processing of large HTML files

## Troubleshooting

### Docker Issues

1. If ports are already in use:
   ```bash
   Error: listen EADDRINUSE: address already in use :::3000
   ```
   Solution: Stop any other applications using ports 3000 or 5000

2. If Docker containers fail to start:
   ```bash
   docker-compose down
   docker-compose up --build
   ```

3. To view logs:
   ```bash
   docker-compose logs -f
   ```

### Common Issues

1. "Network Error" when uploading files:
   - Check if both frontend and backend are running
   - Ensure files are valid Extent report HTML files
   - Try with smaller files first

2. "No test results found":
   - Verify that the HTML files are valid Extent reports
   - Check if the files contain test results in the expected format

## For SDETs

This tool is particularly useful for:
- Identifying flaky tests that fail intermittently
- Tracking test stability across multiple test runs
- Finding patterns in test failures
- Quick access to test results across multiple reports

## Contributing

Feel free to open issues or submit pull requests for any improvements or bug fixes. 