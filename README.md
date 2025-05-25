# Extent Report Analyzer

A web application for analyzing and comparing multiple Extent reports. This tool helps SDETs and QA teams to identify patterns in test failures and track test results across multiple test runs.

## Features

1. Dynamic report comparison - select how many reports you want to compare
2. Upload and analyze multiple Extent reports
3. View common failing tests across all reports
4. Search for specific test cases and see their results across all reports
5. Modern, user-friendly interface with sorting options

## Local Development Setup

### Backend (Python Flask)

1. Create a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the Flask server:
```bash
python app.py
```

The backend server will start at http://localhost:5000

### Frontend (React)

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The frontend application will start at http://localhost:3000

## Deployment Instructions

### Backend Deployment (Render.com)

1. Create a new account on [Render.com](https://render.com)

2. Click "New +" and select "Web Service"

3. Connect your GitHub repository

4. Configure the service:
   - Name: extent-report-analyzer-api
   - Environment: Python
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn app:app`
   - Plan: Free

5. Click "Create Web Service"

### Frontend Deployment (Netlify)

1. Create a new account on [Netlify](https://netlify.com)

2. From the Netlify dashboard:
   - Click "Add new site"
   - Choose "Import an existing project"
   - Connect to GitHub and select your repository

3. Configure the build settings:
   - Base directory: `frontend`
   - Build command: `npm run build`
   - Publish directory: `frontend/build`

4. Add environment variable:
   - Key: `REACT_APP_API_URL`
   - Value: Your Render.com backend URL (e.g., https://your-app.onrender.com)

5. Click "Deploy site"

### Alternative Frontend Deployment (Vercel)

1. Create a new account on [Vercel](https://vercel.com)

2. Install Vercel CLI:
```bash
npm install -g vercel
```

3. Navigate to the frontend directory and run:
```bash
vercel
```

4. Follow the prompts and add the environment variable:
   - REACT_APP_API_URL=your-render-backend-url

## Usage

1. Access your deployed application using the Netlify/Vercel URL
2. Select the number of reports you want to compare
3. Upload your Extent report HTML files
4. Use the search and sorting features to analyze test results

## Notes

- The free tier of Render.com may have cold starts
- The uploads folder is ephemeral on Render.com, files will be cleared periodically
- For permanent storage, consider adding cloud storage (e.g., AWS S3)

## For SDETs

This tool is particularly useful for:
- Identifying flaky tests that fail intermittently
- Tracking test stability across multiple test runs
- Finding patterns in test failures
- Quick access to test results across multiple reports

## Contributing

Feel free to open issues or submit pull requests for any improvements or bug fixes. 