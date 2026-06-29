node dist/database/scripts/truncate-db.js
if %errorlevel% neq 0 exit /b %errorlevel%
node dist/database/scripts/setup-db.js
if %errorlevel% neq 0 exit /b %errorlevel%
node dist/command/command.js run-instance-commands --force
if %errorlevel% neq 0 exit /b %errorlevel%
node dist/command/command.js cache:flush
if %errorlevel% neq 0 exit /b %errorlevel%
node dist/command/command.js workspace:seed:dev
if %errorlevel% neq 0 exit /b %errorlevel%
