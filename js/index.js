const log = $("#log");
const input = $("#input");
const neighborhoodPopover = $("#neighborhoodPopover");
const monthDropdown = $("#month");

const baseURL = calcBaseURL();

buildDropdown();

// The super helpful examples
    // https://docs.mapbox.com/mapbox-gl-js/example/hover-styles/
    // https://docs.mapbox.com/mapbox-gl-js/example/updating-choropleth/


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
    d3.json(baseURL + "/static/just_profit.json"),
    d3.json(baseURL + "/static/forecasts.json"),
    d3.json(baseURL + "/static/agg_data_nbhood.json"),
    d3.json(baseURL + "/static/burough.json")
]).then(function([nyc, profit, forecasts, agg_nbhood, borough]){

    // Create map
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

    // Add zoom widget
    map.addControl(new mapboxgl.NavigationControl());

    // Builds all visuals.
    // Sets event listener on dropdown to change forecast month
    map.on('load', function () {

        setMapLayer("12");

        // Show Upper West Side by default
        makeLineChart("Upper West Side", JSON.stringify(forecasts["Upper West Side"]));
        var table = agg_nbhood_info("Upper West Side", JSON.stringify(agg_nbhood["Upper West Side"]));
        borough_graph(borough["12"]);

        monthDropdown.on("change", function(){
            let month = monthDropdown.val()
            setMapLayer(month);
            borough_graph(borough[month]);
        });
    });


    function setMapLayer(month) {
        let minProfit = 9999999;
        let maxProfit = -9999999;

        nyc.features.forEach(function(d){
            // only set once
            if(d.properties.forecasts == undefined){
                d.properties.forecasts = forecasts[d.properties.neighborhood];
                d.properties.agg = agg_nbhood[d.properties.neighborhood];
            }

            d.properties.profit = profit[month][d.properties.neighborhood];
            if(d.properties.profit != null){
                if(d.properties.profit < minProfit) {
                    minProfit = d.properties.profit;
                }
                if(d.properties.profit > maxProfit) {
                    maxProfit = d.properties.profit;
                }
            }
        });

        makeMapLegend(minProfit, maxProfit);

        // If source not initiated, create source and layer with constant paint options
        if(map.getSource("source_id") == undefined) {
            map.addSource('source_id', {"type": "geojson", "data":nyc});
            map.addLayer({"id": "layer_id", "source": "source_id", "type":"fill", "layout":{}});
            map.setPaintProperty("layer_id",'fill-outline-color', '#000');
            map.setPaintProperty("layer_id",'fill-opacity', [
                    'case',
                    ["==", ['get', 'profit'], null],
                    0.6,
                    0.8
                ]);
        }

        // If source is initiated, update the source data
        else {
            map.getSource("source_id").setData(nyc);
        }

        // Update paint color
        map.setPaintProperty("layer_id","fill-color", [
                    'case',
                    ["==", ['get', 'profit'], null],
                    "#e1e7e8",
                    ['interpolate',
                    ['linear'],
                    ['get', 'profit'],
                    minProfit, "#D2222D",
                    0, "#FFE599",
                    maxProfit, "#007000"]
                ]);

        // Handles tooltip behavior
        map.on("mousemove", "layer_id", function (e) {
            let tooltip = buildToolTip(e.features[0].properties.neighborhood, e.features[0].properties.profit);
            neighborhoodPopover.css("left", (e.originalEvent.pageX + 10) + "px");
            neighborhoodPopover.css("top", (e.originalEvent.pageY - 12) + "px");
            neighborhoodPopover.css("opacity", 1);
            neighborhoodPopover.css("z-index", 1);
            neighborhoodPopover.html(tooltip);

            // Changes cursor if hovering over neighborhood without data
            map.getCanvas().style.cursor = e.features[0].properties.profit == "null" ? 'not-allowed' : '';
        });

        // Make tooltip disappear
        map.on("mouseleave", "layer_id", function (e) {
            neighborhoodPopover.css("opacity", 0);
        });

        // If neighborhood has data, update graphs and table
        map.on("click", "layer_id", function (e) {
            if(e.features[0].properties.profit != "null") {
                d3.select("#svg").remove();
                d3.select("#table").remove();
                var table = agg_nbhood_info(e.features[0].properties.neighborhood, e.features[0].properties.agg)
                makeLineChart(e.features[0].properties.neighborhood, e.features[0].properties.forecasts)
            }
        });
    }
});


// Helper functions

function borough_graph(data) {
    console.log(data);
    d3.select("#borough-svg").remove();
    let height = 100;
    let width = 220;
    let margin = { top: 60, bottom: 60, left: 60, right: 60 };

//     var data = [
//   { borough: "Bronx", Forecast: "7349", Airbnb: "2566"},
//   { borough: "Manhattan", Forecast: "25877", Airbnb: "9804"},
//   { borough: "Staten Island", Forecast: "8235", Airbnb: "1998"},
//   { borough: "Queens", Forecast: "12768", Airbnb: "7612"},
//   { borough: "Brooklyn", Forecast: "18443", Airbnb: "12002"},
// ];

    // var data = data_json[month];
    // console.log(data);

    var example_stack = d3.stack()
    .keys(["Forecast", "Airbnb"])
    .order(d3.stackOrderNone)
    .offset(d3.stackOffsetDiverging);
    var stack = example_stack(data);
    // console.log(stack)

var x = d3.scaleBand()
  .domain(['Bronx', 'Manhattan', 'Staten Island', 'Queens', 'Brooklyn'])
  .range([0, width])
  .padding(0.1)
var y = d3.scaleLinear()
  .domain([d3.min(stack, function(d) {  return d3.min(d, function(d) { return d[0]; });  }),
      d3.max(stack, function(d) {  return d3.max(d, function(d) { return d[1]; });  })])
  .range([height, 0]);

var colors = ["#D94C55", "#ffab99"];

var svg = d3.select("#borough-chart")
      .append("svg")
    .attr("width", "100%")
        // .attr("width", width + margin.left + margin.right)
        // .attr("height", height + margin.top + margin.bottom)
    .attr("viewBox", "0 0 " + (width + margin.left + margin.right) + " " +  (height + margin.top + margin.bottom))
        .attr("id", "borough-svg");

var yAxis = d3.axisLeft().ticks(7)
  .scale(y);

var xAxis = d3.axisBottom()
  .scale(x);

svg.append("g")
  .attr("class", "y axis")
  .attr("transform",
              "translate(" + margin.left + "," + margin.top + ")")
  .call(yAxis)

// svg.append("g")
//   .attr("class", "x axis")
//   .attr("transform",
//               "translate(" + margin.left + "," + (margin.top + y(0)) + ")")
//   .style("fill", "#000")
//   .call(xAxis);

svg.append("text")
    .attr("class", "title")
    .text("Profit Contribution Breakdown by Borough")
    .attr("text-anchor", "middle")
    .attr("x", margin.left + width/2)
    .attr("y", margin.top/2)
    .attr("font-size", "0.7rem");

svg.append("text")
    .attr("class", "title")
    .text("Profit($)")
    .attr("text-anchor", "middle")
    .attr("x", -(margin.top + height/2))
    .attr("y", 10)
    .attr("font-size", "10px")
    .attr("transform", "rotate(-90)");


// Create groups for each series, rects for each segment 
var groups = svg.selectAll("g.cost")
  .data(stack)
  .enter().append("g")
  .attr("class", "cost")
  .style("fill", function(d, i) { return colors[i]; });

let section_total = width/5;
let bar_width = 20;

var rect = groups.selectAll("rect")
  .data(function(d) { return d; })
  .enter()
  .append("rect")
  .attr("x", function(d) { return x(d.data.borough) + margin.left + (section_total - bar_width)/2 - 3; })
  .attr("y", function(d) {
      // console.log(d[0],  d[1]);
      return margin.top + y(d[1]); })
  .attr("height", function(d) {  return y(d[0]) - y(d[1]); })
  .attr("width", bar_width);

svg.append("g")
  .attr("class", "x axis")
  .attr("transform",
              "translate(" + margin.left + "," + (margin.top + height) + ")")
              // "translate(" + margin.left + "," + (margin.top + y(0)) + ")")
  .style("fill", "#000")
  .call(xAxis);

svg.append('line')
    .attr('x1', 0)
    .attr('y1', y(0))
    .attr('x2', width)
    .attr('y2', y(0))
    .attr('stroke', "#000")
    .attr("transform",
              "translate(" + margin.left + "," + (margin.top) + ")")
    .attr('class', 'zeroline');

// total width (width) (remainder/2)
// (total - width)/2 + width
  // .on("mouseover", function() { tooltip.style("display", null); })
  // .on("mouseout", function() { tooltip.style("display", "none"); })
  // .on("mousemove", function(d) {
  //   var xPosition = d3.mouse(this)[0] - 15;
  //   var yPosition = d3.mouse(this)[1] - 25;
  //   tooltip.attr("transform", "translate(" + xPosition + "," + yPosition + ")");
  //   tooltip.select("text").text(d.y);
  // });



// Draw legend
var legend = svg.selectAll(".legend")
  .data(colors) // reverse to put Airbnb on top to match stacked bars
  .enter()
  //   .append("g")
  // .attr("class", "legend")
  // .attr("transform", function(d, i) { return "translate(30," + i * 10 + ")"; });
 
legend.append("rect")
  .attr("x", margin.left + width * 0.80)
    .attr("y", function(d, i){
        // console.log(i);
        return i * 10 + 42;})
  .attr("width", 8)
  .attr("height", 8)
  .style("fill", function(d, i) {return colors.slice()[i];});
 
legend.append("text")
  .attr("x",  margin.left + width * 0.80 + 12)
  .attr("y", function(d, i){
      // console.log(i);
      return i * 10 + 47;})
  .attr("dy", "1px")
  .attr("font-size", "8px")

  .style("text-anchor", "start")
  .text(function(d, i) { 
    switch (i) {
      case 0: return "Airbnb Rental";
      case 1: return "Property Appreciation";
    }
  });

  
}

function agg_nbhood_info(neighborhood, dict){
    dict = JSON.parse(dict);
    // console.log(dict);
    d3.select("#agg-data-title").text("Average Statistics for " + neighborhood);
    var table = d3.select("#agg-data").append("table")
            .attr("style", "margin-left: 0px")
            .attr("style", "font-size: 0.5rem")
            .attr("id", "table");

    // var thead = table.append("thead");
    var tbody = table.append("tbody");
    var columns = ['near_landmarks', 'near_subways', 'most_recent', 'availability_365', 'calculated_host_listings_count', 'minimum_nights', 'price']

    let col_labels = {'near_landmarks': "Landmarks",
        'near_subways': "Subway Stations",
        'most_recent': "Days Since Last Review",
        'availability_365': "Days Available per Year",
        'calculated_host_listings_count': "Listings per Host",
        'minimum_nights': "Minimum Nights per Stay",
        'price': "Price($)"};
    // append the header row
    data = Object.keys(dict).map(function(k) { return {key:k, value:dict[k]} })
    // thead.append("tr")
    //     .selectAll("th")
    //     .data(['Attribute', 'Average Value'])
    //     .enter()
    //     .append("th")
    //         .text(function(column) { return column; });

    // create a row for each object in the data
    var rows = tbody.selectAll("tr")
        .data(data)
        .enter()
        .append('tr');

    rows.append("td")
        .text(function(d) { ;return col_labels[d.key]; });

    rows.append("td")
        .attr("class", "text-right")
        .text(function(d) { return Math.round(d.value); });
    // .append("input")
    // .attr('readonly', true)
    // .attr("name", "byName")
    // .attr("type", "text")
    // .attr("value",function(d) { return Math.round(d.value); });

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
    let height = 340;
    let width = height * 1.25;
    let margin = {top: 50, bottom: 50, left: 80, right: 20};

    var svg = d3.select("#neighborhoodChart")
      .append("svg")
        .attr("width", "100%")
        .attr("viewBox", "0 0 " + (width + margin.left + margin.right) + " " + (height + margin.top + margin.bottom))
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
      .domain(d3.extent(dataPoints, function(d) { return d.date; }))
      .range([ 0, width ]);

    svg.append("g")
      .attr("transform", "translate(" + margin.left + "," + (height + margin.top) + ")")
      .attr("class", "x_axis")
      .call(d3.axisBottom(x));

    svg.append("text")
        .text("Year")
        .attr("text-anchor", "middle")
        .attr("x", margin.left + width/2)
        .attr("y", margin.top + height + 40)
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
        .attr("y", margin.left/4)
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
    // Remove legend if one is there
    d3.select("#map-legend").remove();

    let width = 200;
    let height = 10;
    let margin = {top: 20, bottom: 20, left: 25, right: 25};

    let svg = d3.select("#legend").append("svg");

    svg.attr("width", "100%")
        .attr("viewBox", "0 0 " + (width + margin.left + margin.right) + " " + (height + margin.top + margin.bottom))
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
        .attr("x", margin.left)
        .attr("y", margin.top)
        .style("fill", "url(#linear-gradient)")
        .style("fill-opacity", 0.90)
        // .attr("transform", "translate(20,20)");

    // legend title
    svg.append("text")
        .attr("class", "legendTitle")
        .attr("x", margin.left + width/2)
        .attr("y", margin.top/2)
        .style("text-anchor", "middle")
        .text("Expected Profit ($)")
        .style("font-size", "0.8rem");

    //Set scale for x-axis
    var xScale = d3.scaleLinear()
         .range([0, width])
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
        .attr("transform", "translate(" + margin.left + "," + (margin.top + height/2) + ")")
        .attr('stroke-width', 0)
        .call(xAxis);
}

// currently supports 59 months into the future
function buildDropdown(){
    for(var i = 1; i <= 57; i++){
        if(i == 12){
            monthDropdown.append("<option selected>" + i + "</option>");
        }
        else{
            monthDropdown.append("<option>" + i + "</option>");
        }
    }
}