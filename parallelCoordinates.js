/* Setup -------------- ---------------------------------------*/

var m = [170, 120, 20, 120],
	w = 1280 - m[1] - m[3],
	h = 500 - m[0] - m[2];


d3.select("body").append("div")
	.attr("id", "topContainer")
	.style({"width": w + m[1] + m[3], "margin": "auto", "height": "40px", "text-align":"left", "padding": "20px"});
	
d3.select("#topContainer")
	.append("button")
		.attr({"class": "download", "type": "Button", "href": "#"})
		.on("click", crowbar)
		.text("Download SVG");


d3.select("body").append("div")
	.attr("id", "graphContainer")
	.style({"width": w + m[1] + m[3], "margin": "auto"});

d3.select("body").append("div")
	.attr("id", "grid")

d3.select("body").append("div")
	.attr("id", "pager")


var csvdata = d3.select("#csvdata").text();
csvdata = d3.csv.parse(csvdata);

csvdata.forEach(function(d,i) { d.id = d.id || i; });

function pcVars() {
	var variables = d3.keys(csvdata[0])
	var inputs = []
	for(var x = 1; x < variables.length; x++) {
		if (variables[x] != "id") {
			inputs.push(variables[x]);
		}
	}
	return inputs;
}

var x = d3.scale.ordinal()
	.domain(pcVars())
	.rangePoints([0, w]),

	y = {};

var line = d3.svg.line(),//.interpolate("cardinal").tension(0.95),
	axis = d3.svg.axis().orient("left")
		.tickPadding(5);

axis.ticks(6);



var svg = d3.select("#graphContainer").append("svg")
	.attr("id", "visualization")
	.attr("width", w + m[1] + m[3])
	.attr("height", h + m[0] + m[2])
  .attr("xmlns", "http://www.w3.org/2000/svg")
.append("g")
	.attr("transform", "translate(" + m[3] + "," + m[0] + ")");



/* Data range for each variable ---------------------------------------*/

pcVars().forEach(function(d) {
	csvdata.forEach(function(dd) {
		dd[d] = +dd[d];
	});

	y[d] = d3.scale.linear()
		.domain(d3.extent(csvdata, function(dd) {
			return dd[d];
		}))
		.range([h, 0]).nice();

	y[d].brush = d3.svg.brush()
		.y(y[d])
		.on("brush", brush);
});



/* Creating the chart -------------------------------------------------*/

var foreground = svg.append("g")
	.attr("class", "foreground")
.selectAll("path")
	.data(csvdata)
	.enter().append("path")
	.attr("d", path)
	.attr("id", function(d) { return "index" + d.id; });


var g = svg.selectAll(".variable")
	.data(pcVars())
.enter().append("g")
	.attr("class", "variable")
	.attr("transform", function(d) { return "translate(" + x(d) + ")"; });
	//.call(d3.behavior.drag()
		//.origin(function(d) { return {x: x(d)}; })
		//.on("dragstart", dragstart)
		//.on("drag", drag)
		//.on("dragend", dragend));

g.append("g")
	.attr("class", "axis")
	.each(function(d, i) { d3.select(this).call(axis.scale(y[d])); })
.append("text")
	.attr("text-anchor", "start")
	.attr("x", 8)
  .attr("y", 2)
  .attr("dx", 0)
  .attr("dy", 0)
  .attr("transform", "rotate(-90)")
	.text(String)
  .call(wrap, 150);

g.append("g")
	.attr("class", "brush")
	.each(function(d) { d3.select(this).call(y[d].brush); })
.selectAll("rect")
	.attr("x", -9)
	.attr("width", 18);

/*
function dragstart(d) {
	i = pcVars().indexOf(d);
}

function drag(d) {
	x.range()[i] = d3.event.x;
	pcVars().sort(function(a, b) {return x(a) - x(b); });
	
	g.attr("transform", function(d) { return "translate(" + x(d) + ")"; });
	foreground.attr("d", path);
}

function dragend(d) {
	x.domain(pcVars()).rangePoints([0, w]);

	var t = d3.transition().duration(500);
	t.selectAll(".variable").attr("transform", function(d) { return "translate(" + x(d) + ")"; });
	t.selectAll(".foreground path").attr("d", path);
}
*/

function path(d) {
	return line(pcVars().map(function(dd) { return [x(dd), y[dd](d[dd])]; }));
}


/* Brush Actions -------------------------------------------------*/

function brush() {
	var actives = pcVars().filter(function(d) { return !y[d].brush.empty(); }),
		extents = actives.map(function(d) { return y[d].brush.extent(); });
	foreground.classed("fade", function(d) {
		return !actives.every(function(dd, i) {
			return extents[i][0] <= d[dd] && d[dd] <= extents[i][1];
		});
	});

	var brushed = csvdata.filter(function(d) {
		return actives.every(function(dd, i) {
			return extents[i][0] <= d[dd] && d[dd] <= extents[i][1];
		});
	}); 
	
	gridUpdate(brushed)
}



/* SSlick Grid -------------------------------------------------*/


var column_keys = function(data) {
	return d3.keys(data[0]).filter(function(d) { return d != "id"; });
}

var columns = column_keys(csvdata).map(function(key, i) {
	return {id: key, name: key, field: key, sortable: true}
});

var options = {
	enableCellNavigation: true,
	enableColumnReorder: false,
	multiColumnSort: true,
	forceFitColumns: true
};

var dataView = new Slick.Data.DataView();
var grid = new Slick.Grid("#grid", dataView, columns, options);
var pager = new Slick.Controls.Pager(dataView, grid, $("#pager"));

dataView.onRowsChanged.subscribe(function (e, args) {
	grid.invalidateRows(args.rows);
	grid.render();
});

dataView.onRowCountChanged.subscribe(function (e, args) {
  grid.updateRowCount();
  grid.render();
});


grid.onSort.subscribe(function (e, args) {
  var cols = args.sortCols;

  dataView.sort(function (dataRow1, dataRow2) {
    for (var i = 0, l = cols.length; i < l; i++) {
      var field = cols[i].sortCol.field;
      var sign = cols[i].sortAsc ? 1 : -1;
      var value1 = dataRow1[field], value2 = dataRow2[field];
      var result = (value1 == value2 ? 0 : (value1 > value2 ? 1 : -1)) * sign;
      if (result != 0) {
        return result;
      }
    }
    return 0;
  });
  grid.invalidate();
  grid.render();
});


 function highlightPath(id) {
 	var i = "#index" + id;
	d3.select(i).classed("highlight", true);
 }



 function unHighlightPath(id) {
 	var i = "#index" + id;
	d3.select(i).classed("highlight", false);
 }


grid.onMouseEnter.subscribe(function(e,args) {
	
	var i = grid.getCellFromEvent(e).row;
	var d = grid.getDataItem(i).id;
    
	highlightPath(d)

});


grid.onMouseLeave.subscribe(function(e,args) {
    
    var i = grid.getCellFromEvent(e).row;
	var d = grid.getDataItem(i).id;

    unHighlightPath(d)

});


gridUpdate(csvdata);


function gridUpdate(data) {
    dataView.beginUpdate();
    dataView.setItems(data);
    dataView.endUpdate();
 }



function wrap(text, width) {
  text.each(function() {
    var text = d3.select(this),
        words = text.text().split(/\s+/).reverse(),
        word,
        line = [],
        lineNumber = 0,
        lineHeight = 1.1, // ems
        y = text.attr("y"),
        dy = parseFloat(text.attr("dy")),
        tspan = text.text(null).append("tspan").attr("x", 8).attr("y", y).attr("dy", dy + "em");
    while (word = words.pop()) {
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(" "));
        line = [word];
        tspan = text.append("tspan").attr("x", 8).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
      }
    }
  });
}

d3.selectAll(".tick text")
  .attr({"fill": "#000", "stroke": "#fff", "stroke-width": "6px", "paint-order": "stroke", "stroke-opacity": .75});



/* SVG Crowbar -------------------------------------------------*/




function crowbar() {
  var doctype = '<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">';

  window.URL = (window.URL || window.webkitURL);

  var script = document.createElement('script');
  script.onload = initialize;
  script.src = "http://d3js.org/d3.v3.min.js";
  document.head.appendChild(script);

  function initialize() {
    var documents = [window.document],
        SVGSources = [];
    d3.selectAll("iframe").each(function() {
      if (this.contentDocument) {
        documents.push(this.contentDocument);
      }
    });
    documents.forEach(function(doc) {
      var styles = getStyles(doc);
      var newSources = getSources(doc, styles);
      // because of prototype on NYT pages
      for (var i = 0; i < newSources.length; i++) {
        SVGSources.push(newSources[i]);
      };
    })
    if (SVGSources.length > 1) {
      createPopover(SVGSources);
    } else if (SVGSources.length > 0) {
      download(SVGSources[0]);
    } else {
      alert("The Crowbar couldnâ€™t find any SVG nodes.");
    }
  }

  function createPopover(sources) {
    cleanup();

  var drag = d3.behavior.drag()
      .origin(function() {
        var el = d3.select(this)
        return {
          x: el.style("left").replace("px", ""),
          y: el.style("top").replace("px", "")
        }
      })
      .on("drag", dragmove);

    sources.forEach(function(s1) {
      sources.forEach(function(s2) {
        if (s1 !== s2) {
          if ((Math.abs(s1.top - s2.top) < 38) && (Math.abs(s1.left - s2.left) < 38)) {
            s2.top += 38;
            s2.left += 38;
          }
        }
      })
    })

    var body = d3.select("body");

    var buttons = body.append("div")
        .attr("class", "svg-crowbar")
        .style("z-index", 1e7)
        .style("position", "absolute")
        .style("top", 0)
        .style("left", 0);

    var button = buttons.selectAll(".crowbar-button")
        .data(sources)
      .enter().append("div")
        .attr("class", "crowbar-button")
        .style("position", "absolute")
        .style("top", function(d) { return (d.top + document.body.scrollTop) + "px"; })
        .style("left", function(d) { return (document.body.scrollLeft + d.left) + "px"; })
        .style("padding", "4px")
        .style("border-radius", "3px")
        .style("color", "white")
        .style("text-align", "center")
        .style("font-family", "'Helvetica Neue'")
        .style("background", "rgba(0, 0, 0, 0.8)")
        .style("box-shadow", "0px 4px 18px rgba(0, 0, 0, 0.4)")
        .style("cursor", "move")
        .text(function(d, i) { return "SVG #" + i + ": " + (d.id ? "#" + d.id : "") + (d.class ? "." + d.class : "")})
      .append("button")
        .style("width", "150px")
        .style("font-size", "12px")
        .style("line-height", "1.4em")
        .style("margin", "5px 0 0 0")
        .text("Download")
        .on("click", function(d, i) {
          d3.event.preventDefault();
          download(d);
        });

    buttons.selectAll(".crowbar-button").call(drag);

    var html = body.append("div")
        .attr("class", "svg-crowbar")
        .style("background", "rgba(255, 255, 255, 0.7)")
        .style("position", "fixed")
        .style("left", 0)
        .style("top", 0)
        .style("width", "100%")
        .style("height", "100%");

    function dragmove(d) {
      d3.select(this)
          .style("left", d3.event.x + "px")
          .style("top", d3.event.y + "px");
    }
  }

  function cleanup() {
    d3.selectAll(".svg-crowbar").remove();
  }



  function getSources(doc, styles) {
    var svgInfo = [],
        svgs = d3.select(doc).selectAll("svg");

    styles = (styles === undefined) ? "" : styles;

    svgs.each(function () {
      var svg = d3.select(this);
      svg.attr("version", "1.1")
        .insert("defs", ":first-child")
          .attr("class", "svg-crowbar")
        .append("style")
          .attr("type", "text/css");

      // removing attributes so they aren't doubled up
      svg.node().removeAttribute("xmlns");
      svg.node().removeAttribute("xlink");

      // These are needed for the svg
      if (!svg.node().hasAttributeNS(d3.ns.prefix.xmlns, "xmlns")) {
        svg.node().setAttributeNS(d3.ns.prefix.xmlns, "xmlns", d3.ns.prefix.svg);
      }

      if (!svg.node().hasAttributeNS(d3.ns.prefix.xmlns, "xmlns:xlink")) {
        svg.node().setAttributeNS(d3.ns.prefix.xmlns, "xmlns:xlink", d3.ns.prefix.xlink);
      }

      var source = (new XMLSerializer()).serializeToString(svg.node()).replace('</style>', '<![CDATA[' + styles + ']]></style>');
      var rect = svg.node().getBoundingClientRect();
      svgInfo.push({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        class: svg.attr("class"),
        id: svg.attr("id"),
        childElementCount: svg.node().childElementCount,
        source: [doctype + source]
      });
    });
    return svgInfo;
  }

  function download(source) {
    var filename = "untitled";

    if (source.id) {
      filename = source.id;
    } else if (source.class) {
      filename = source.class;
    } else if (window.document.title) {
      filename = window.document.title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    }

    var url = window.URL.createObjectURL(new Blob(source.source, { "type" : "text\/xml" }));

    var a = d3.select("body")
        .append('a')
        .attr("class", "svg-crowbar")
        .attr("download", filename + ".svg")
        .attr("href", url)
        .style("display", "none");

    a.node().click();

    setTimeout(function() {
      window.URL.revokeObjectURL(url);
    }, 10);
  }

  function getStyles(doc) {
    var styles = "",
        styleSheets = doc.styleSheets;

    if (styleSheets) {
      for (var i = 0; i < styleSheets.length; i++) {
        processStyleSheet(styleSheets[i]);
      }
    }

    function processStyleSheet(ss) {
      if (ss.cssRules) {
        for (var i = 0; i < ss.cssRules.length; i++) {
          var rule = ss.cssRules[i];
          if (rule.type === 3) {
            // Import Rule
            processStyleSheet(rule.styleSheet);
          } else {
            // hack for illustrator crashing on descendent selectors
            if (rule.selectorText) {
              if (rule.selectorText.indexOf(">") === -1) {
                styles += "\n" + rule.cssText;
              }
            }
          }
        }
      }
    }
    return styles;
  }

}
