from flask import Flask, request, jsonify
from flask_cors import CORS
from bs4 import BeautifulSoup
import os
import logging
from werkzeug.utils import secure_filename
from collections import Counter

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
# Allow all origins for now to debug CORS issues
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

# Get upload folder from environment or default to 'uploads'
UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', 'uploads')
ALLOWED_EXTENSIONS = {'html'}

# Ensure upload directory exists and is writable
try:
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    # Test write permissions
    test_file = os.path.join(UPLOAD_FOLDER, 'test.txt')
    with open(test_file, 'w') as f:
        f.write('test')
    os.remove(test_file)
    logger.info(f"Upload directory {UPLOAD_FOLDER} is ready and writable")
except Exception as e:
    logger.error(f"Error setting up upload directory: {str(e)}")
    # Fall back to /tmp if available
    if os.path.exists('/tmp') and os.access('/tmp', os.W_OK):
        UPLOAD_FOLDER = '/tmp'
        logger.info("Falling back to /tmp directory")
    else:
        logger.error("No writable upload directory available")

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024  # 32MB max file size

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_test_results(report_path):
    try:
        logger.debug(f"Reading file: {report_path}")
        with open(report_path, 'r', encoding='utf-8') as file:
            soup = BeautifulSoup(file, 'lxml')

        test_results = []
        test_items = soup.find_all("li", class_="test-item")
        logger.debug(f"Found {len(test_items)} test items")

        for item in test_items:
            status = item.get("status", "").lower()
            name_tag = item.find("p", class_="name")
            if name_tag:
                test_name = name_tag.text.strip()
                test_results.append({
                    "name": test_name,
                    "status": status
                })

        return test_results
    except Exception as e:
        logger.error(f"Error extracting test results from {report_path}: {str(e)}")
        raise

@app.route('/upload', methods=['POST'])
def upload_files():
    try:
        if 'files' not in request.files:
            logger.error("No files in request")
            return jsonify({"error": "No files provided"}), 400

        files = request.files.getlist('files')
        saved_files = []
        
        # Validate files before saving
        for file in files:
            if not file:
                logger.error("Empty file object received")
                continue
                
            if not file.filename:
                logger.error("Empty filename received")
                continue
                
            if not allowed_file(file.filename):
                logger.error(f"Invalid file type: {file.filename}")
                continue
            
            try:
                # Read a bit of content to verify file is not empty
                content_start = file.read(1024)
                if not content_start:
                    logger.error(f"Empty file content: {file.filename}")
                    continue
                    
                # Reset file pointer to start
                file.seek(0)
                
                filename = secure_filename(file.filename)
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                logger.debug(f"Saving file to: {filepath}")
                
                # Verify directory exists and is writable
                if not os.path.exists(app.config['UPLOAD_FOLDER']):
                    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
                    
                file.save(filepath)
                
                # Verify file was actually saved
                if not os.path.exists(filepath):
                    logger.error(f"File was not saved: {filepath}")
                    continue
                    
                saved_files.append(filepath)
                logger.info(f"Successfully saved file: {filepath}")
                
            except Exception as e:
                logger.error(f"Error saving file {file.filename}: {str(e)}")
                continue

        if not saved_files:
            return jsonify({"error": "No valid files were uploaded"}), 400

        logger.info(f"Successfully uploaded {len(saved_files)} files")
        return jsonify({"message": f"{len(saved_files)} files uploaded successfully", "files": saved_files}), 200
    except Exception as e:
        logger.error(f"Error in upload: {str(e)}")
        return jsonify({"error": f"Upload error: {str(e)}"}), 500

@app.route('/analyze', methods=['POST'])
def analyze_reports():
    try:
        report_paths = request.json.get('reportPaths', [])
        logger.debug(f"Analyzing reports: {report_paths}")
        
        if not report_paths:
            return jsonify({"error": "No report paths provided"}), 400

        all_results = {}
        for path in report_paths:
            try:
                # Ensure the file exists
                if not os.path.exists(path):
                    logger.error(f"File not found: {path}")
                    return jsonify({"error": f"File not found: {path}"}), 404
                
                results = extract_test_results(path)
                all_results[os.path.basename(path)] = results
            except Exception as e:
                logger.error(f"Error processing {path}: {str(e)}")
                return jsonify({"error": f"Error processing {path}: {str(e)}"}), 500

        # Find failing tests across all reports
        failing_tests = {}
        test_failure_count = Counter()  # Track failure count for each test
        test_execution_count = Counter()  # Track total executions for each test
        
        for report_name, results in all_results.items():
            for test in results:
                test_execution_count[test["name"]] += 1
                if test["status"] == "fail":
                    if test["name"] not in failing_tests:
                        failing_tests[test["name"]] = []
                    failing_tests[test["name"]].append(report_name)
                    test_failure_count[test["name"]] += 1

        # Calculate failure rates and create sorted lists
        test_stats = []
        for test_name in test_execution_count:
            failure_rate = (test_failure_count[test_name] / test_execution_count[test_name]) * 100
            test_stats.append({
                "name": test_name,
                "failureCount": test_failure_count[test_name],
                "executionCount": test_execution_count[test_name],
                "failureRate": round(failure_rate, 2)
            })

        # Sort test stats by different criteria
        sorted_by_failure_count = sorted(test_stats, key=lambda x: x["failureCount"], reverse=True)
        sorted_by_failure_rate = sorted(test_stats, key=lambda x: x["failureRate"], reverse=True)

        # Get test status across all reports
        test_status_map = {}
        for report_name, results in all_results.items():
            for test in results:
                if test["name"] not in test_status_map:
                    test_status_map[test["name"]] = {}
                test_status_map[test["name"]][report_name] = test["status"]

        logger.info("Analysis completed successfully")
        return jsonify({
            "failingTests": failing_tests,
            "testStatusMap": test_status_map,
            "testStats": {
                "byFailureCount": sorted_by_failure_count,
                "byFailureRate": sorted_by_failure_rate
            }
        }), 200
    except Exception as e:
        logger.error(f"Error in analysis: {str(e)}")
        return jsonify({"error": f"Analysis error: {str(e)}"}), 500

@app.route('/search', methods=['POST'])
def search_test():
    test_name = request.json.get('testName', '').lower()
    report_paths = request.json.get('reportPaths', [])

    if not test_name or not report_paths:
        return jsonify({"error": "Test name and report paths are required"}), 400

    results = {}
    test_stats = {}
    
    for path in report_paths:
        try:
            all_tests = extract_test_results(path)
            report_name = os.path.basename(path)
            
            for test in all_tests:
                if test_name in test["name"].lower():
                    test_key = test["name"]
                    if test_key not in results:
                        results[test_key] = {}
                        test_stats[test_key] = {"pass": 0, "fail": 0, "total": 0}
                    
                    results[test_key][report_name] = test["status"]
                    test_stats[test_key][test["status"]] += 1
                    test_stats[test_key]["total"] += 1
                    
        except Exception as e:
            return jsonify({"error": f"Error processing {path}: {str(e)}"}), 500

    # Calculate failure rates for searched tests
    search_stats = []
    for test_name, stats in test_stats.items():
        failure_rate = (stats["fail"] / stats["total"]) * 100 if stats["total"] > 0 else 0
        search_stats.append({
            "name": test_name,
            "failureCount": stats["fail"],
            "executionCount": stats["total"],
            "failureRate": round(failure_rate, 2)
        })

    return jsonify({
        "results": results,
        "stats": sorted(search_stats, key=lambda x: x["failureRate"], reverse=True)
    }), 200

if __name__ == '__main__':
    app.run(debug=True) 