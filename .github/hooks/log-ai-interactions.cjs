const fs = require('node:fs');
const path = require('node:path');

try {
  const event = JSON.parse(fs.readFileSync(0, 'utf8'));
  const type = process.argv[2];
  const record = {
    timestamp: new Date().toISOString(),
    sessionId: event.session_id || event.sessionId || null,
    type
  };

  if (type === 'prompt') {
    if (typeof event.prompt !== 'string') {
      throw new TypeError('Prompt event must contain a prompt string.');
    }
    record.content = event.prompt;
  } else if (type === 'output') {
    const transcriptPath = event.transcript_path || event.transcriptPath;
    if (typeof transcriptPath !== 'string' || !transcriptPath) {
      throw new Error('Stop event must contain a transcript path.');
    }
    record.format = 'transcript';
    record.content = fs.readFileSync(transcriptPath, 'utf8');
  } else {
    throw new Error('Expected prompt or output mode.');
  }

  const logDirectory = process.env.COPILOT_INTERACTION_LOG_DIR ||
    path.resolve(__dirname, '../../.ai-logs');
  fs.mkdirSync(logDirectory, { recursive: true, mode: 0o700 });
  fs.appendFileSync(
    path.join(logDirectory, 'ai-interactions.log'),
    JSON.stringify(record) + '\n',
    { encoding: 'utf8', mode: 0o600 }
  );
  process.stdout.write('{}');
} catch (error) {
  process.stderr.write('AI interaction logging failed (' + (error.code || error.name) + '). Check hook input and log/transcript access.\n');
  process.exitCode = 1;
}