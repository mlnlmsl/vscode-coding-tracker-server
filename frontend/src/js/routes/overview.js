let utils = require('../utils/utils'),
	resizer = require('../utils/resizer'),
	router = require('../router'),
	reportFilter = require('../reportFilter'),
	API = require('../api'),
	{ URL } = API;
	
let $page = $('.page-overview');

let chartSummary = require('../charts/summary');
let chart24hs = require('../charts/24hours');
let chartProjects = require('../charts/projects');
let chartFiles = require('../charts/file');
let chartComputers = require('../charts/computer');
let chartLanguages = require('../charts/language');
/** @type {EChartsInstance[]} */
let charts = [];

/** @type {ReportFilter} */
let requestFilter = null;

module.exports = { name: 'overview', start, stop };

function stop() { charts.map(chart => chart.dispose()); $page.hide(); }
function start() { 
	$page.show();
	
	charts = [
		chartProjects.init(utils.getChartDom(chartProjects.recommendedChartId, $page)[0],
			project => router.to('projects', project), 5)
	].concat([
		chartSummary,
		chart24hs,
		chartFiles,
		chartComputers,
		chartLanguages
	].map(c => c.init(utils.getChartDom(c.recommendedChartId, $page)[0])));
		
	resizer.removeSubscriber();
	resizer.subscribe(charts);

	reportFilter.removeSubscribers();
	reportFilter.subscribe(request);
	
	request(reportFilter.getFilter());
}

/** @param {ReportFilter} filter */
function request(filter) { 
	requestFilter = Object.assign({}, filter);
	API.requestSilent(URL.overview(), onOverviewResponse);
	API.requestSilent(URL.hours(), on24HoursResponse);
}

/** @param {APIResponse} data */
function on24HoursResponse(data) {
	chart24hs.update(utils.expandAndShortGroupByHoursObject(data.groupBy.hour, Date.now()));
	showTotalTimes(data.total, $('#counterLast24Hs'));
}

/** @param {APIResponse} data */
function onOverviewResponse(data) { 
	chartSummary.update(getSummaryDataFromResponse(data))
	showTotalTimes(data.total, $('#counterSummary'));

	chartProjects.update(data.groupBy.project);
	chartFiles.update(data.groupBy.file);
	chartComputers.update(data.groupBy.computer);
	chartLanguages.update(data.groupBy.language);
}


/** @param {APIResponse} data */
function getSummaryDataFromResponse(data) {
	let groupByDayData = $.extend(true, {}, data.groupBy.day),
		summaryData = utils.expandGroupByDaysObject(groupByDayData, requestFilter.from, requestFilter.to);
	return summaryData;
}
/**
 * @param {WatchingCodingObject} totalObject 
 * @param {JQuery} $dom 
 */
function showTotalTimes(totalObject, $dom) {
	let totalHoursMap = utils.convertUnit2Hour({ total: totalObject });
	let data = utils.getReadableTimeStringFromMap(totalHoursMap).total;
	$dom.find('[name]').each((i, e) => $(e).text(data[$(e).attr('name')]));
}