#!/usr/bin/env python3
"""
Database Multi-URL Backup Utility
=================================
This script recursively backs up multiple databases locally using their connection URLs.
It parses connection strings, detects the appropriate system utility (pg_dump, mysqldump, or file copying),
performs the backup, compresses the output to gzip, and maintains clean, timestamped folder hierarchies.

Features:
- Supports PostgreSQL (`postgres://` / `postgresql://`), MySQL (`mysql://`), and SQLite (`sqlite://` / file paths).
- Automatically gzips outputs to save disk space.
- Gracefully handles errors (continues backing up other databases if one fails).
- Outputs summary logs with emojis and execution durations.
- Can read connection URLs from a config JSON, environment variables, or a hardcoded list.
"""

import os
import sys
import json
import gzip
import shutil
import subprocess
from datetime import datetime
from urllib.parse import urlparse, unquote

# ==================== CONFIGURATION ====================
# Resolve paths relative to this script
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SERVER_DIR = os.path.dirname(SCRIPT_DIR) # packages/server

# Default directory where backups will be saved.
DEFAULT_BACKUP_DIR = os.path.join(SERVER_DIR, "database_backups")

# Default database URLs list (used if no config JSON or environment variable is provided).
DEFAULT_DB_URLS = [
    # "postgresql://username:password@localhost:5432/my_database",
    # "mysql://username:password@localhost:3306/another_db",
    # "sqlite:///C:/absolute/path/to/database.db"
]
# ========================================================

def print_banner():
    print("=" * 70)
    print(" 🛡️   DATABASE MULTI-URL BACKUP UTILITY")
    print(f" Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)

def parse_db_url(url):
    """
    Parses a connection URL and extracts database type, credentials, host, port, and db name.
    """
    try:
        if url.startswith("sqlite://"):
            # Handle SQLite connection URL
            path = url.replace("sqlite:///", "").replace("sqlite://", "")
            return {
                "type": "sqlite",
                "path": os.path.abspath(unquote(path)),
                "name": os.path.basename(path)
            }
        
        parsed = urlparse(url)
        scheme = parsed.scheme.lower()
        
        db_type = None
        if scheme in ["postgres", "postgresql"]:
            db_type = "postgres"
        elif scheme == "mysql":
            db_type = "mysql"
        else:
            db_type = scheme
            
        return {
            "type": db_type,
            "username": unquote(parsed.username or ""),
            "password": unquote(parsed.password or ""),
            "host": parsed.hostname or "localhost",
            "port": parsed.port,
            "name": unquote(parsed.path.lstrip("/")),
            "original_url": url
        }
    except Exception as e:
        print(f" ❌ Error parsing URL '{url}': {e}")
        return None

def get_utility_path(utility):
    """
    Finds the path to a shell utility. Checks PATH first,
    then standard installation directories on Windows if not found.
    """
    path = shutil.which(utility)
    if path:
        return path
        
    if sys.platform == "win32":
        if utility == "pg_dump":
            # Check standard PostgreSQL versions 10 to 25
            for version in range(25, 9, -1):
                p = f"C:\\Program Files\\PostgreSQL\\{version}\\bin\\pg_dump.exe"
                if os.path.exists(p):
                    return p
        elif utility == "mysqldump":
            # Check standard MySQL/MariaDB/XAMPP paths
            mysql_paths = [
                "C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysqldump.exe",
                "C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqldump.exe",
                "C:\\Program Files\\MariaDB 11.0\\bin\\mysqldump.exe",
                "C:\\xampp\\mysql\\bin\\mysqldump.exe"
            ]
            for p in mysql_paths:
                if os.path.exists(p):
                    return p
    return None

def backup_postgres(info, backup_path):
    """
    Performs PostgreSQL backup using pg_dump.
    """
    pg_dump_path = get_utility_path("pg_dump")
    if not pg_dump_path:
        raise RuntimeError("System utility 'pg_dump' is not installed or not in PATH.")
    
    # Prepare environment variables to supply password securely without prompting
    env = os.environ.copy()
    if info["password"]:
        env["PGPASSWORD"] = info["password"]
    
    cmd = [
        pg_dump_path,
        "-h", info["host"],
        "-U", info["username"],
        "-d", info["name"]
    ]
    if info["port"]:
        cmd.extend(["-p", str(info["port"])])
        
    print(f" 🔌 Connecting to PostgreSQL: {info['host']} (Database: {info['name']})...")
    
    # Run pg_dump and pipe standard output directly to gzip file
    with gzip.open(backup_path, 'wb') as f_out:
        process = subprocess.Popen(cmd, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        stdout, stderr = process.communicate()
        
        if process.returncode != 0:
            err_msg = stderr.decode('utf-8', errors='replace').strip()
            raise RuntimeError(f"pg_dump failed with exit code {process.returncode}: {err_msg}")
        
        f_out.write(stdout)

def backup_mysql(info, backup_path):
    """
    Performs MySQL backup using mysqldump.
    """
    mysqldump_path = get_utility_path("mysqldump")
    if not mysqldump_path:
        raise RuntimeError("System utility 'mysqldump' is not installed or not in PATH.")
    
    cmd = [mysqldump_path, "-h", info["host"], "-u", info["username"]]
    
    if info["password"]:
        cmd.append(f"-p{info['password']}")  # Note: mysqldump password flag has no space
    if info["port"]:
        cmd.extend(["-P", str(info["port"])])
        
    cmd.append(info["name"])
    
    print(f" 🔌 Connecting to MySQL: {info['host']} (Database: {info['name']})...")
    
    with gzip.open(backup_path, 'wb') as f_out:
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        stdout, stderr = process.communicate()
        
        if process.returncode != 0:
            err_msg = stderr.decode('utf-8', errors='replace').strip()
            raise RuntimeError(f"mysqldump failed with exit code {process.returncode}: {err_msg}")
        
        f_out.write(stdout)

def backup_sqlite(info, backup_path):
    """
    Performs SQLite backup by copying the database file.
    """
    db_file = info["path"]
    if not os.path.exists(db_file):
        raise FileNotFoundError(f"SQLite file not found at: {db_file}")
        
    print(f" 📂 Reading SQLite file: {db_file}...")
    
    # Read the file and compress it into the gz backup path
    with open(db_file, 'rb') as f_in:
        with gzip.open(backup_path, 'wb') as f_out:
            shutil.copyfileobj(f_in, f_out)

def load_urls_from_config(config_path):
    """
    Loads database URLs from a JSON config file.
    """
    if not os.path.exists(config_path):
        return None
    try:
        with open(config_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                return data
            elif isinstance(data, dict) and "urls" in data:
                return data["urls"]
    except Exception as e:
        print(f" ⚠️ Warning: Failed to read config JSON file '{config_path}': {e}")
    return None

def main():
    print_banner()
    
    # 1. Load URLs from config.json, environment variables, or default list
    config_file = "backup_config.json"
    
    # Try current directory first, then resolve relative to script's server directory
    config_path = config_file
    if not os.path.exists(config_path):
        alt_path = os.path.join(SERVER_DIR, config_file)
        if os.path.exists(alt_path):
            config_path = alt_path
            
    urls = load_urls_from_config(config_path)
    
    if not urls:
        env_urls = os.environ.get("DATABASE_URLS")
        if env_urls:
            try:
                urls = [u.strip() for u in env_urls.split(",") if u.strip()]
            except Exception:
                pass
                
    if not urls:
        urls = DEFAULT_DB_URLS
        
    if not urls:
        # Create a sample backup_config.json so the user can easily fill it
        sample_config = {
            "urls": [
                "postgresql://postgres:password@localhost:5432/my_kitchen_db",
                "mysql://root:password@127.0.0.1:3306/storefront_db",
                "sqlite:///C:/Github/shutter/packages/server/data/local.db"
            ]
        }
        config_path_to_write = os.path.join(SERVER_DIR, config_file)
        with open(config_path_to_write, "w", encoding="utf-8") as f:
            json.dump(sample_config, f, indent=2)
            
        print(f" ℹ️ No connection URLs found.")
        print(f" 📝 Created a template config file at: [backup_config.json](file:///{os.path.abspath(config_path_to_write)})")
        print(" 💡 Please edit this file with your database URLs, and run the script again.")
        print("=" * 70)
        return
        
    # 2. Setup backup directory
    backup_dir = DEFAULT_BACKUP_DIR
    os.makedirs(backup_dir, exist_ok=True)
    print(f" 📁 Backup folder: [database_backups](file:///{os.path.abspath(backup_dir)})")
    print(f" 🔄 Found {len(urls)} databases to back up.\n")
    
    # 3. Process each database
    success_count = 0
    failure_count = 0
    summary = []
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    for idx, url in enumerate(urls, 1):
        print(f"--- [{idx}/{len(urls)}] Processing Database ---")
        info = parse_db_url(url)
        if not info:
            print(" ❌ Skipping due to invalid connection URL format.\n")
            failure_count += 1
            summary.append({"index": idx, "name": "Invalid URL", "status": "FAIL", "reason": "URL parsing error"})
            continue
            
        db_type = info["type"]
        db_name = info["name"]
        
        # Extract host prefix to prevent collision for databases with identical names (e.g. "railway")
        db_host = info.get("host", "localhost")
        host_prefix = db_host.split(".")[0] if "." in db_host else db_host
        
        # Create target filename incorporating both host prefix and db name
        safe_name = f"{db_type}_{host_prefix}_{db_name}".replace(":", "_").replace("/", "_").replace("\\", "_")
        filename = f"backup_{safe_name}_{timestamp}.sql.gz"
        if db_type == "sqlite":
            filename = f"backup_{safe_name}_{timestamp}.db.gz"
            
        dest_path = os.path.join(backup_dir, filename)
        start_time = datetime.now()
        
        try:
            if db_type == "postgres":
                backup_postgres(info, dest_path)
            elif db_type == "mysql":
                backup_mysql(info, dest_path)
            elif db_type == "sqlite":
                backup_sqlite(info, dest_path)
            else:
                raise ValueError(f"Unsupported database scheme/type: {db_type}")
                
            duration = (datetime.now() - start_time).total_seconds()
            size_mb = os.path.getsize(dest_path) / (1024 * 1024)
            
            print(f" ❇️ Success! Saved backup to: {filename}")
            print(f" 📊 File size: {size_mb:.3f} MB | Time taken: {duration:.2f} seconds\n")
            
            success_count += 1
            summary.append({
                "index": idx,
                "name": db_name,
                "type": db_type,
                "status": "SUCCESS",
                "size_mb": size_mb,
                "duration": duration,
                "file": filename
            })
            
        except Exception as e:
            print(f" ❌ Backup failed: {e}\n")
            failure_count += 1
            summary.append({
                "index": idx,
                "name": db_name,
                "type": db_type,
                "status": "FAIL",
                "reason": str(e)
            })
            
    # 4. Print Summary Report
    print("=" * 70)
    print(" 📊 BACKUP PROCESS SUMMARY")
    print("=" * 70)
    print(f" Total databases processed: {len(urls)}")
    print(f" ✅ Successful backups:     {success_count}")
    print(f" ❌ Failed backups:         {failure_count}")
    print("-" * 70)
    
    for item in summary:
        status_emoji = "✅" if item["status"] == "SUCCESS" else "❌"
        if item["status"] == "SUCCESS":
            print(f" {status_emoji} #{item['index']} [{item['type'].upper()}] {item['name']}: Succeeded in {item['duration']:.2f}s ({item['size_mb']:.3f} MB) ➜ {item['file']}")
        else:
            print(f" {status_emoji} #{item['index']} [{item.get('type', 'UNKNOWN').upper()}] {item['name']}: Failed ➜ {item['reason']}")
            
    print("=" * 70)

if __name__ == "__main__":
    main()
