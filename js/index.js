const height = 360;
const width = height * 1.25;
const margin = {top: "20px", bottom: "20px", left: "20px", right: "0px"}

const log = $("#log");
const input = $("#input");
const neighborhoodPopover = $("#neighborhoodPopover");
const neighborhoodChart = $("#neighborhoodChart");

const baseURL = calcBaseURL();
// var flag = 0



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
    d3.json(baseURL + "/static/forecasts.json")

]).then(function([nyc, profit, forecasts]){

    // add profit attribute to each feature
    nyc.features.forEach(function(d){
        d.properties.profit = profit[d.properties.neighborhood];
        d.properties.forecasts = forecasts[d.properties.neighborhood];
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
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [-74.0060, 40.7108],
        zoom: 9,
        minZoom: 9,
        maxZoom: 15,
        maxBounds: new mapboxgl.LngLatBounds(
            new mapboxgl.LngLat(-74.41798730468805, 40.49183755125762),
            new mapboxgl.LngLat(-73.59401269531324, 40.92904478186287)
        )
    });

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
        makeLineChart(e.features[0].properties.neighborhood, e.features[0].properties.forecasts)

    });

});


// Helper functions
function makeLineChart(neighborhood, dict){
    var svg = d3.select("#neighborhoodChart")
      .append("svg")
        .attr("width", width)
        .attr("height", height )
        .attr("id", "svg")
      .append("g")
        .attr("transform",
              "translate(" + 10 + "," + 0 + ")");
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

    var x = d3.scaleTime()
      .domain(d3.extent(dataPoints, function(d) { return d.date; }))
      .range([ 0, width ]);
    svg.append("g")
      .attr("transform", "translate(100," + height + ")")
      .attr("class", "x_axis")
      .call(d3.axisBottom(x));
    // Add Y axis
    var y = d3.scaleLinear()
      .domain([d3.min(dataPoints, function(d) { return +d.forecast; }), d3.max(dataPoints, function(d) { return +d.forecast; })])
      .range([ height, 0 ]);
    svg.append("g")
      .attr("class", "y_axis")
      .call(d3.axisLeft(y));
    svg.append("path")
      .datum(dataPoints)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 1.5)
      .attr("class", "line")
      .attr("d", d3.line()
        .x(function(d) { return x(d.date) })
        .y(function(d) { return y(d.forecast) })
        )

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