from flask import Flask, request, jsonify
from flask_cors import CORS
from bs4 import BeautifulSoup
import os
from werkzeug.utils import secure_filename
from collections import Counter

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'html'}

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_test_results(report_path):
    with open(report_path, 'r', encoding='utf-8') as file:
        soup = BeautifulSoup(file, 'lxml')

    test_results = []
    test_items = soup.find_all("li", class_="test-item")

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

@app.route('/upload', methods=['POST'])
def upload_files():
    if 'files' not in request.files:
        return jsonify({"error": "No files provided"}), 400

    files = request.files.getlist('files')
    saved_files = []

    for file in files:
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            saved_files.append(filepath)

    return jsonify({"message": f"{len(saved_files)} files uploaded successfully"}), 200

@app.route('/analyze', methods=['POST'])
def analyze_reports():
    report_paths = request.json.get('reportPaths', [])
    if not report_paths:
        return jsonify({"error": "No report paths provided"}), 400

    all_results = {}
    for path in report_paths:
        try:
            results = extract_test_results(path)
            all_results[os.path.basename(path)] = results
        except Exception as e:
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

    return jsonify({
        "failingTests": failing_tests,
        "testStatusMap": test_status_map,
        "testStats": {
            "byFailureCount": sorted_by_failure_count,
            "byFailureRate": sorted_by_failure_rate
        }
    }), 200

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