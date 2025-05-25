import os
import time
import logging
from datetime import datetime, timedelta

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

UPLOAD_FOLDER = 'uploads'
MAX_AGE_HOURS = 24  # Files older than this will be deleted

def cleanup_old_files():
    """Clean up files older than MAX_AGE_HOURS in the uploads directory."""
    if not os.path.exists(UPLOAD_FOLDER):
        logger.info(f"Upload directory {UPLOAD_FOLDER} does not exist")
        return

    now = datetime.now()
    count = 0

    for filename in os.listdir(UPLOAD_FOLDER):
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        try:
            # Get file's last modification time
            mtime = datetime.fromtimestamp(os.path.getmtime(filepath))
            age = now - mtime

            # If file is older than MAX_AGE_HOURS, delete it
            if age > timedelta(hours=MAX_AGE_HOURS):
                os.remove(filepath)
                count += 1
                logger.info(f"Deleted old file: {filename}")
        except Exception as e:
            logger.error(f"Error processing {filename}: {str(e)}")

    logger.info(f"Cleanup completed. Removed {count} files.")

if __name__ == '__main__':
    cleanup_old_files() 