const fs = require('fs');
const file = 'src/hooks/useGoogleDrive.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("import { DriveService } from '@/lib/drive';", "import { DriveService } from '@/lib/drive';\nimport { CalendarService } from '@/lib/calendar';");
content = content.replace("driveService: DriveService | null;", "driveService: DriveService | null;\n  calendarService: CalendarService | null;");
content = content.replace("driveService: null,", "driveService: null,\n  calendarService: null,");
content = content.replace("const [driveService, setDriveService] = useState<DriveService | null>(null);", "const [driveService, setDriveService] = useState<DriveService | null>(null);\n  const [calendarService, setCalendarService] = useState<CalendarService | null>(null);");
content = content.replace("setDriveService(ds);", "setDriveService(ds);\n      setCalendarService(new CalendarService(tokenResponse.access_token));");
content = content.replace("setDriveService(null);", "setDriveService(null);\n    setCalendarService(null);");
content = content.replace("value={{ driveService, appFolderId, isSyncing, login, logout }}", "value={{ driveService, calendarService, appFolderId, isSyncing, login, logout }}");

fs.writeFileSync(file, content);
console.log('done');
