const height = 360;
const width = height * 1.25;
const margin = {top: 50, bottom: 80, left: 100, right: 20}

const log = $("#log");
const input = $("#input");
const neighborhoodPopover = $("#neighborhoodPopover");
const neighborhoodChart = $("#neighborhoodChart");
const mapLegendDiv = $("#legend");

const baseURL = calcBaseURL();



// Whenever this form has a submit event,
// $("form").submit(function (event) {
//     // prevent form from redirecting/making a request and do this instead
//     event.preventDefault();
//
//     // Creates FormData object and sticks file in there
//     let formData = new FormData();
//     let input_text = input.val();
//     formData.append("meow", input_text);
//
//     // Makes a POST request to the uploader endpoint
//     // If successful, tell user file was uploaded successfully and clear #file_input
//     // Else, tell user it failed
//     $.get('model/'+ input_text, function(data){
//
//     }).done(function(response) {
//         console.log(response);
//         log.text("Request was uploaded successfully.");
//         input.val(null);;
//     }).fail(function() {
//         log.text("The request failed.");
//     });
// });

// Load nyc geojson and profit dictionary
Promise.all([
    d3.json(baseURL + "/static/nyc.json"),
    d3.json(baseURL + "/static/just_profit_dict.json"),
    d3.json(baseURL + "/static/forecasts.json"),
    d3.json(baseURL + "/static/agg_data_nbhood.json")



]).then(function([nyc, profit, forecasts, agg_nbhood]){

    // add profit attribute to each feature
    nyc.features.forEach(function(d){
        d.properties.profit = profit[d.properties.neighborhood];
        d.properties.forecasts = forecasts[d.properties.neighborhood];
        d.properties.agg = agg_nbhood[d.properties.neighborhood];

    });

    // hardcoded for now, but can be changed later
    minProfit = -320201.2825470001;
    maxProfit = 135032.2265031793;

    // Not sure if we're gonna use this or not
    colorScale = d3.scaleQuantize()
        .domain([minProfit, maxProfit])
        .range(d3.schemeRdYlGn[9]);

    colorScale_section_size = (maxProfit - minProfit) / 8;

    // Setup map
    mapboxgl.accessToken = 'pk.eyJ1IjoidGFuazc2NSIsImEiOiJjazJ5ZHNndDgwNzI0M2JxdGZpaHh6OTFyIn0.NbINRMNm2chbLryFxoWCtg';
    map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/light-v10',
        center: [-74.0060, 40.7108],
        zoom: 9,
        minZoom: 9,
        maxZoom: 15,
        maxBounds: new mapboxgl.LngLatBounds(
            new mapboxgl.LngLat(-74.41798730468805, 40.49183755125762),
            new mapboxgl.LngLat(-73.59401269531324, 40.92904478186287)
        )
    });

    makeMapLegend(minProfit, maxProfit);

    // adds zoom widget
    map.addControl(new mapboxgl.NavigationControl());

    // Adds the geojson and coloring on map load
    map.on('load', function () {
        layer = map.addLayer({
            'id': 'neighborhoods',
            'type': 'fill',
            'source': {
                'type': 'geojson',
                'data': nyc
            },
            'layout': {},
            'paint': {
                // 'fill-color': '#B0DE5C',
                'fill-color': [
                    'interpolate',
                    ['linear'],
                    ['get', 'profit'],
                    // minProfit, "#d73027",
                    // minProfit + colorScale_section_size, "#f46d43",
                    // minProfit + colorScale_section_size * 2, "#fdae61",
                    // minProfit + colorScale_section_size * 3, "#fee08b",
                    // minProfit + colorScale_section_size * 4, "#ffffbf",
                    // minProfit + colorScale_section_size * 5, "#d9ef8b",
                    // minProfit + colorScale_section_size * 6, "#a6d96a",
                    // minProfit + colorScale_section_size * 7, "#66bd63",
                    // maxProfit, "#1a9850"
                    minProfit, "#D2222D",
                    0, "#FFE599",
                    maxProfit, "#007000"
                ],
                'fill-opacity': 0.80,
                'fill-outline-color': '#000'
            }
        });
    });
    // The super helpful examples
    // https://docs.mapbox.com/mapbox-gl-js/example/hover-styles/
    // https://docs.mapbox.com/mapbox-gl-js/example/updating-choropleth/

    // Show Upper West Side by default
    makeLineChart("Upper West Side", JSON.stringify(forecasts["Upper West Side"]));
    var table = agg_nbhood_info("Upper West Side", JSON.stringify(agg_nbhood["Upper West Side"]));

    // Handles tooltip behavior
    map.on("mousemove", "neighborhoods", function (e) {
        let tooltip = buildToolTip(e.features[0].properties.neighborhood, e.features[0].properties.profit);
        neighborhoodPopover.css("left", e.originalEvent.pageX + "px");
        neighborhoodPopover.css("top", e.originalEvent.pageY + "px");
        neighborhoodPopover.css("opacity", 1);
        neighborhoodPopover.css("z-index", 1);
        neighborhoodPopover.html(tooltip);
    });

    map.on("mouseleave", "neighborhoods", function (e) {
        neighborhoodPopover.css("opacity", 0);
    });

    map.on("click", "neighborhoods", function (e) {
        console.log(e.features[0].properties)

        d3.select("#svg").remove();
        d3.select("#table").remove();
        var table = agg_nbhood_info(e.features[0].properties.neighborhood, e.features[0].properties.agg)
        makeLineChart(e.features[0].properties.neighborhood, e.features[0].properties.forecasts)

    });

});


// Helper functions

function agg_nbhood_info(neighborhood, dict){
    dict = JSON.parse(dict);
    console.log(dict);
    var table = d3.select("#agg-data").append("table")
            .attr("style", "margin-left: 0px")
            .attr("style", "font-size: 6.5px")

            .attr("id", "table");
    var thead = table.append("thead");
    var tbody = table.append("tbody");
    var columns = ['near_landmarks', 'near_subways', 'most_recent', 'availability_365', 'calculated_host_listings_count', 'minimum_nights', 'price']
    // append the header row
    data = Object.keys(dict).map(function(k) { return {key:k, value:dict[k]} })
    thead.append("tr")
        .selectAll("th")
        .data(['Attribute', 'Average Value'])
        .enter()
        .append("th")
            .text(function(column) { return column; });

    // create a row for each object in the data
    var rows = tbody.selectAll("tr")
        .data(data)
        .enter()
        .append('tr');
    rows.append("td")
    .text(function(d) { ;return d.key; });

    rows
    .append("td")
    .append("input")
    .attr('readonly', true)
    .attr("name", "byName")
    .attr("type", "text")
    .attr("value",function(d) { return Math.round(d.value); });

    // create a cell in each row for each column
    // var cells = rows.selectAll("td")
    //     .data(function(row) {
    //         return columns.map(function(column) {
    //             console.log(row[column]);
    //             return {column: column, value: row[column]};
    //         });
    //     })
    //     .enter()
    //     .append("td")
    //     .attr("style", "font-family: Courier") // sets the font style
    //         .html(function(d) { return d.value; });
    
    return table;

}
function makeLineChart(neighborhood, dict){
    var svg = d3.select("#neighborhoodChart")
      .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .attr("id", "svg");

    var data = [];
    var dataSeries = { type: "line" };
    var dataPoints = [];
    dict = JSON.parse(dict);
    var combined_data = dict.historical_prices.concat(dict.forecast_prices)
    var year = 1996
    var month = 0
    for (var i=0; i < combined_data.length; i++){
        dataPoints.push({
            date: new Date(year, month, 1),
            forecast:combined_data[i]
        });
        month += 1;
        if (month > 12){
            month = 1;
            year += 1;
        }
    }

    dataSeries.dataPoints = dataPoints;
    data.push(dataSeries);

    // Line Chart Title
    svg.append("text")
				.attr("class", "title")
				.text(neighborhood + " Housing Prices (1996 - 2024)")
				.attr("text-anchor", "middle")
				.attr("x", (width/2 + margin.left))
				.attr("y", margin.top/2)
				.attr("font-size", "18px");

    // Add X axis
    var x = d3.scaleTime()
      .domain(d3.extent(dataPoints, function(d) { console.log(d.date); return d.date; }))
      .range([ 0, width ]);

    svg.append("g")
      .attr("transform", "translate(" + margin.left + "," + (height + margin.top) + ")")
      .attr("class", "x_axis")
      .call(d3.axisBottom(x));

    svg.append("text")
        .text("Year")
        .attr("text-anchor", "middle")
        .attr("x", margin.left + width/2)
        .attr("y", margin.top + height + margin.bottom/2)
        .attr("font-size", "0.8rem");

    // Add Y axis
    var y = d3.scaleLinear()
      .domain([d3.min(dataPoints, function(d) { return +d.forecast; }), d3.max(dataPoints, function(d) { return +d.forecast; })])
      .range([ height, 0 ]);
    svg.append("g")
      .attr("class", "y_axis")
      .attr("transform", "translate("+ margin.left +", " + margin.top + ")")
      .call(d3.axisLeft(y));

    // Y axis label
    svg.append("text")
        .text("Price ($)")
        .attr("text-anchor", "middle")
        .attr("y", margin.left/3)
        .attr("x", -(margin.top + height/2))
        .attr("font-size", "0.8rem")
        .attr("transform", "rotate(-90)");

    // Plot line
    svg.append("path")
      .datum(dataPoints)
      .attr("fill", "steelblue")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 1.5)
      .attr("class", "line")
      .attr("d", d3.line()
        .x(function(d) { return x(d.date) + margin.left })
        .y(function(d) { return y(d.forecast) + margin.top })
        );

}

function formatMoney(num){
    var prefix = "$";
    var strNum = num.toString();
    if(strNum[0] == "-"){
        strNum = strNum.substr(1);
        prefix = "-" + prefix;
    }
    return prefix + strNum;
}

// Puts profit below the name if there is a value. Nothing under the name otherwise.
function buildToolTip(neighborhood, num){
    var result = neighborhood;
    if(num != "null"){
        result += "<br/>" + formatMoney(num);
    }
    return result;
}

// Standardizes baseURL to not have a slash at the end.
// Allows app to run locally and in production
function calcBaseURL(){
    var result = window.location.href;
    if(result[result.length - 1] == "/"){
        result = result.substr(0, result.length - 1);
    }
    return result;
}

function makeMapLegend(minProfit, maxProfit){
    let svg = d3.select("#legend").append("svg");
    svg.attr("width", "100%")
        .attr("height", "50px")
        .attr("id", "map-legend");

    let defs = svg.append("defs");
    let linearGradient = defs.append("linearGradient")
        .attr("id", "linear-gradient");

    linearGradient
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "0%");

    // Assumes that there are both negative and positive profits. Update if that ever changes.
    let middleOffset = (-1*minProfit/(maxProfit - minProfit)*100).toFixed(4).toString() + "%";

    console.log(middleOffset);

    //Set the color for the start (0%)
    linearGradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#D2222D");

    //Set the color for the end (50%)
    linearGradient.append("stop")
        .attr("offset", middleOffset)
        .attr("stop-color", "#FFE599");

    //Set the color for the end (100%)
    linearGradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#007000");

    svg.append("rect")
        .attr("width", "200px")
        .attr("height", "10px")
        .style("fill", "url(#linear-gradient)")
        .style("fill-opacity", 0.90)
        .attr("transform", "translate(20,20)");

    // legend title
    svg.append("text")
        .attr("class", "legendTitle")
        .attr("x", 120)
        .attr("y", 10)
        .style("text-anchor", "middle")
        .text("Expected Profit ($)")
        .style("font-size", "0.8rem");

    //Set scale for x-axis
    var xScale = d3.scaleLinear()
         .range([0, 200])
         .domain([ minProfit, maxProfit] );

    //Define x-axis
    var xAxis = d3.axisBottom(xScale)
          // .ticks(5)
        .tickValues([minProfit, 0, maxProfit])
          //.tickFormat(formatPercent)
          .scale(xScale);

    //Set up X axis
    svg.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(20,25)")
        .call(xAxis);
}