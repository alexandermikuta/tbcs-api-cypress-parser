import moment = require("moment");

export class ReportLogger {
  private static TEST_RESULT_FOLDER = 'test-results';

  public static info(msg: string) {
    ReportLogger.log('INFO', msg);
  }

  public static debug(msg: string) {
    ReportLogger.log('DEBUG', msg);
  }

  public static warn(msg: string) {
    ReportLogger.log('WARN', msg);
  }

  public static error(msg: string) {
    ReportLogger.log('ERROR', msg);
  }

  private static log(level: string, msg: string) {
    cy.writeFile(`${ReportLogger.TEST_RESULT_FOLDER}/reporter.log`, moment().toISOString() + '\t' + level + '\t' + msg + '\n', { encoding: 'utf8', flag: 'as+' });
  }
}
