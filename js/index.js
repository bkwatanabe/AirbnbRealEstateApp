const height = 720;
const width = height * 1.25;

const log = $("#log");
const input = $("#input");
const neighborhoodPopover = $("#neighborhoodPopover");
// Whenever this form has a submit event,
$("form").submit(function (event) {
    // prevent form from redirecting/making a request and do this instead
    event.preventDefault();

    // Creates FormData object and sticks file in there
    let formData = new FormData();
    let input_text = input.val();
    formData.append("meow", input_text);

    // Makes a POST request to the uploader endpoint
    // If successful, tell user file was uploaded successfully and clear #file_input
    // Else, tell user it failed
    $.get('model/'+ input_text, function(data){

    }).done(function(response) {
        console.log(response);
        log.text("Request was uploaded successfully.");
        input.val(null);;
    }).fail(function() {
        log.text("The request failed.");
    });
});

// var svg = d3.select("svg").attr("viewBox", `0 0 ${width} ${height}`);

// http://data.beta.nyc//dataset/0ff93d2d-90ba-457c-9f7e-39e47bf2ac5f/resource/35dd04fb-81b3-479b-a074-a27a37888ce7/download/d085e2f8d0b54d4590b1e7d1f35594c1pediacitiesnycneighborhoods.geojson
// d3.json("nyc.json", function(error, nyc) {
//     if (error) throw error;
// var nyc_data;
// d3.json("nyc.json").then(function(nyc) {
//
//     nyc_data = nyc;
//
//   // var projection = d3.geoAlbersUsa().translate([w/2 - 80, h/2 - 20]).scale([1000]);
//   // var path = d3.geoPath().projection(projection);
//
//   var path = d3.geoPath()
//       .projection(d3.geoConicConformal()
//       .parallels([33, 45])
//       .rotate([96, -39])
//       .fitSize([width, height], nyc));
//
//
//   svg.selectAll("path")
//       .data(nyc.features)
//       .enter().append("path")
//       .attr("d", path)
//       .on("mouseenter", function(d) {
//         console.log(d);
//       d3.select(this)
//       .style("stroke-width", 1.5)
//       .style("stroke-dasharray", 0)
//
//       d3.select("#neighborhoodPopover")
//       .transition()
//       .style("opacity", 1)
//       .style("left", (d3.event.pageX) + "px")
//       .style("top", (d3.event.pageY) + "px")
//       .text(d.properties.neighborhood)
//
//     })
//     .on("mouseleave", function(d) {
//       d3.select(this)
//       .style("stroke-width", .25)
//       .style("stroke-dasharray", 1)
//
//       d3.select("#neighborhoodPopover")
//       .transition()
//       .style("opacity", 0);
//     });
//
//     console.log(nyc);
//

//     mapboxgl.accessToken = 'pk.eyJ1IjoidGFuazc2NSIsImEiOiJjazJ5ZHNndDgwNzI0M2JxdGZpaHh6OTFyIn0.NbINRMNm2chbLryFxoWCtg';
//     map = new mapboxgl.Map({
//         container: 'map',
//         style: 'mapbox://styles/mapbox/streets-v11',
//         center: [-74.0060, 40.7108],
//         zoom: 9,
//         minZoom: 9,
//         maxZoom: 15,
//         maxBounds: new mapboxgl.LngLatBounds(
//           new mapboxgl.LngLat(-74.41798730468805, 40.49183755125762),
//           new mapboxgl.LngLat(-73.59401269531324, 40.92904478186287)
//         )
//     });
//
//     map.on('load', function(){
//         layer = map.addLayer({
//             'id':'neighborhoods',
//             'type': 'fill',
//             'source': {
//                 'type': 'geojson',
//                 'data': nyc
//             },
//             'layout':{},
//             'paint': {
//                 'fill-color': '#B0DE5C',
//                 'fill-opacity': 0.65,
//                 'fill-outline-color': '#000'
//             }
//         });
//     });
// // The super helpful example
// // https://docs.mapbox.com/mapbox-gl-js/example/hover-styles/
//
//     map.on("mousemove", "neighborhoods", function(e) {
//         console.log(e);
//         console.log(e.features);
//         neighborhoodPopover.css("left", e.originalEvent.pageX + "px");
//         neighborhoodPopover.css("top", e.originalEvent.pageY + "px");
//         neighborhoodPopover.css("opacity", 1);
//         neighborhoodPopover.css("z-index", 1);
//         neighborhoodPopover.text(e.features[0].properties.neighborhood);
//         // if (e.features.length > 0) {
//         // if (hoveredStateId) {
//         // map.setFeatureState({source: 'states', id: hoveredStateId}, { hover: false});
//         // }
//         // hoveredStateId = e.features[0].id;
//         // map.setFeatureState({source: 'states', id: hoveredStateId}, { hover: true});
//         // }
//         });
//
//     map.on("mouseleave", "neighborhoods", function(e){
//         console.log(e);
//         console.log(e.features); // There's no e.features on mouseleave
//         neighborhoodPopover.css("opacity", 0);
//     });
// });

// $.get("nyc.json").then(function(nyc){
d3.json("nyc.json").then(function(nyc) {

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

map.addControl(new mapboxgl.NavigationControl());

map.on('load', function(){
    layer = map.addLayer({
        'id':'neighborhoods',
        'type': 'fill',
        'source': {
            'type': 'geojson',
            'data': nyc
        },
        'layout':{},
        'paint': {
            'fill-color': '#B0DE5C',
            'fill-opacity': 0.65,
            'fill-outline-color': '#000'
        }
    });
});
// The super helpful example
// https://docs.mapbox.com/mapbox-gl-js/example/hover-styles/

map.on("mousemove", "neighborhoods", function(e) {
    console.log(e);
    console.log(e.features);
    neighborhoodPopover.css("left", e.originalEvent.pageX + "px");
    neighborhoodPopover.css("top", e.originalEvent.pageY + "px");
    neighborhoodPopover.css("opacity", 1);
    neighborhoodPopover.css("z-index", 1);
    neighborhoodPopover.text(e.features[0].properties.neighborhood);
    // if (e.features.length > 0) {
    // if (hoveredStateId) {
    // map.setFeatureState({source: 'states', id: hoveredStateId}, { hover: false});
    // }
    // hoveredStateId = e.features[0].id;
    // map.setFeatureState({source: 'states', id: hoveredStateId}, { hover: true});
    // }
    });

map.on("mouseleave", "neighborhoods", function(e){
    console.log(e);
    console.log(e.features); // There's no e.features on mouseleave
    neighborhoodPopover.css("opacity", 0);
});

});