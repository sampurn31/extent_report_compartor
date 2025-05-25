from flask import Flask, request, jsonify
from flask_cors import CORS
from bs4 import BeautifulSoup
import os
import logging
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading
import re

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Thread-local storage for BeautifulSoup parser
thread_local = threading.local()

app = Flask(__name__)
CORS(app)

# Setup upload folder
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
MAX_WORKERS = 4  # Adjust based on your CPU cores

def get_parser():
    if not hasattr(thread_local, "parser"):
        thread_local.parser = "lxml"
    return thread_local.parser

def allowed_file(filename):
    return filename.lower().endswith('.html')

def extract_test_results(report_path):
    try:
        logger.debug(f"Reading file: {report_path}")
        with open(report_path, 'r', encoding='utf-8') as file:
            # Use thread-local parser instance
            soup = BeautifulSoup(file, get_parser())

        # Use CSS selector for faster selection
        test_items = soup.select("li.test-item")
        logger.debug(f"Found {len(test_items)} test items")

        # Pre-allocate list for better performance
        test_results = []
        for item in test_items:
            status = item.get("status", "").lower()
            # Use direct selector instead of find
            name_tag = item.select_one("p.name")
            if name_tag:
                test_name = name_tag.text.strip()
                test_results.append({
                    "name": test_name,
                    "status": status
                })

        return report_path, test_results
    except Exception as e:
        logger.error(f"Error extracting test results from {report_path}: {str(e)}")
        raise

def search_test_results(test_name, report_paths):
    """Search for a specific test across all reports."""
    try:
        results = {}
        test_failure_count = 0
        test_execution_count = 0
        
        # Process files in parallel
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            future_to_path = {executor.submit(extract_test_results, path): path for path in report_paths}
            
            for future in as_completed(future_to_path):
                path = future_to_path[future]
                report_name = os.path.basename(path)
                try:
                    _, test_results = future.result()
                    
                    # Search for matching tests
                    pattern = re.compile(test_name, re.IGNORECASE)
                    matching_tests = [test for test in test_results if pattern.search(test["name"])]
                    
                    for test in matching_tests:
                        if test["name"] not in results:
                            results[test["name"]] = {}
                        results[test["name"]][report_name] = test["status"]
                        test_execution_count += 1
                        if test["status"] == "fail":
                            test_failure_count += 1
                            
                except Exception as e:
                    logger.error(f"Error searching in {path}: {str(e)}")
                    continue

        # Calculate statistics for matching tests
        stats = []
        for test_name, statuses in results.items():
            execution_count = len(statuses)
            failure_count = sum(1 for status in statuses.values() if status == "fail")
            failure_rate = (failure_count / execution_count * 100) if execution_count > 0 else 0
            
            stats.append({
                "name": test_name,
                "failureCount": failure_count,
                "executionCount": execution_count,
                "failureRate": round(failure_rate, 2)
            })
        
        # Sort stats by failure count
        stats.sort(key=lambda x: x["failureCount"], reverse=True)
        
        return {
            "results": results,
            "stats": stats
        }
    except Exception as e:
        logger.error(f"Error in search: {str(e)}")
        raise

@app.route('/upload', methods=['POST'])
def upload_files():
    try:
        if 'files' not in request.files:
            return jsonify({"error": "No files provided"}), 400

        files = request.files.getlist('files')
        saved_files = []

        for file in files:
            if file and file.filename and allowed_file(file.filename):
                filename = file.filename
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(filepath)
                saved_files.append(filepath)

        if not saved_files:
            return jsonify({"error": "No valid files were uploaded"}), 400

        return jsonify({
            "message": f"{len(saved_files)} files uploaded successfully",
            "files": saved_files
        }), 200
    except Exception as e:
        logger.error(f"Error in upload: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/search', methods=['POST'])
def search():
    try:
        data = request.json
        test_name = data.get('testName')
        report_paths = data.get('reportPaths', [])

        if not test_name:
            return jsonify({"error": "No test name provided"}), 400
        if not report_paths:
            return jsonify({"error": "No report paths provided"}), 400

        # Validate all files exist
        missing_files = [path for path in report_paths if not os.path.exists(path)]
        if missing_files:
            return jsonify({"error": f"Files not found: {', '.join(missing_files)}"}), 404

        results = search_test_results(test_name, report_paths)
        return jsonify(results), 200

    except Exception as e:
        logger.error(f"Error in search: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/analyze', methods=['POST'])
def analyze_reports():
    try:
        report_paths = request.json.get('reportPaths', [])
        if not report_paths:
            return jsonify({"error": "No report paths provided"}), 400

        # Validate all files exist before processing
        missing_files = [path for path in report_paths if not os.path.exists(path)]
        if missing_files:
            return jsonify({"error": f"Files not found: {', '.join(missing_files)}"}), 404

        all_results = {}
        failing_tests = {}
        test_failure_count = Counter()
        test_execution_count = Counter()
        test_status_map = {}

        # Process files in parallel
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            future_to_path = {executor.submit(extract_test_results, path): path for path in report_paths}
            
            for future in as_completed(future_to_path):
                path = future_to_path[future]
                report_name = os.path.basename(path)
                try:
                    _, results = future.result()
                    all_results[report_name] = results

                    # Process results in a single pass
                    for test in results:
                        test_name = test["name"]
                        test_execution_count[test_name] += 1
                        
                        # Update test status map
                        if test_name not in test_status_map:
                            test_status_map[test_name] = {}
                        test_status_map[test_name][report_name] = test["status"]
                        
                        if test["status"] == "fail":
                            if test_name not in failing_tests:
                                failing_tests[test_name] = []
                            failing_tests[test_name].append(report_name)
                            test_failure_count[test_name] += 1

                except Exception as e:
                    logger.error(f"Error processing {path}: {str(e)}")
                    return jsonify({"error": f"Error processing {report_name}: {str(e)}"}), 500

        # Calculate statistics in a single pass
        test_stats = [{
            "name": test_name,
            "failureCount": test_failure_count[test_name],
            "executionCount": count,
            "failureRate": round((test_failure_count[test_name] / count) * 100, 2)
        } for test_name, count in test_execution_count.items()]

        # Sort results
        sorted_by_failure_count = sorted(test_stats, key=lambda x: x["failureCount"], reverse=True)
        sorted_by_failure_rate = sorted(test_stats, key=lambda x: x["failureRate"], reverse=True)

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
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0') 