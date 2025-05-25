# Test Report Analyzer

A web-based tool for analyzing and comparing multiple test execution reports. This tool helps identify patterns in test failures and track test stability across multiple test runs.

## Features

- Upload and analyze multiple HTML test reports
- Compare test results across different runs
- View failure rates and patterns
- Sort tests by failure count and failure rate
- Interactive web interface for easy analysis

## Prerequisites

- Python 3.8 or higher
- Node.js 14.x or higher
- npm 6.x or higher

## Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd Compare-Report
```

2. Set up Python virtual environment:

**Windows:**
```bash
python -m venv venv
.\venv\Scripts\activate
```

**Mac/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

3. Install Python dependencies:
```bash
pip install -r requirements.txt
```

4. Install frontend dependencies:
```bash
cd frontend
npm install
cd ..
```

## Running the Application

You can start the application using the provided startup scripts:

**Windows:**
```bash
start.bat
```

**Mac/Linux:**
```bash
./start.sh
```

Or manually start the servers:

1. Start the backend server:
```bash
# Activate virtual environment first if not already activated
python app.py
```

2. In a separate terminal, start the frontend server:
```bash
cd frontend
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Usage

1. Open http://localhost:3000 in your web browser
2. Click "Upload Reports" to select one or more HTML test reports
3. The system will analyze the reports and display:
   - Test failure patterns
   - Failure rates
   - Comparison across reports
   - Detailed test status information

## Performance Considerations

- The application uses parallel processing to analyze multiple reports efficiently
- For large reports, the analysis might take a few seconds
- The number of parallel workers can be adjusted in `app.py` (MAX_WORKERS)

## Troubleshooting

1. If you see "No module named 'flask'":
   - Make sure you've activated the virtual environment
   - Run `pip install -r requirements.txt`

2. If the frontend fails to start:
   - Make sure you're in the frontend directory
   - Run `npm install` again
   - Check if port 3000 is available

3. If file upload fails:
   - Check if the 'uploads' directory exists
   - Ensure you have write permissions

## Contributing

Feel free to submit issues, fork the repository, and create pull requests for any improvements.

## License

[Your License Here] 