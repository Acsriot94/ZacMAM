function createChartWithData(data, labels, element, type, x_hint, y_hint)
{
    // Prep data
    const dataset = [];

    for (let i=0; i < data.length; i++) {
        const item = data[i];
        const point = {};

        if (x_hint && x_hint == "time") {
            point.x = new Date(item.x * 1000);
        } else {
            point.x = item.x;
        }

        if (y_hint && y_hint == "time") {
            point.y = new Date(item.y * 1000);
        } else {
            point.y = item.y;
        }

        dataset.push(point);
    }

    const x_params = [{}];
    if (x_hint) {
        if (x_hint == "time") x_params[0].type = x_hint;
        if (x_hint == "percent") x_params[0].ticks = {beginAtZero: true, suggestedMax: 100}
    }

    const y_params = [{ticks: {beginAtZero: true}}];
    if (y_hint) {
        if (y_hint == "time") y_params[0].type = y_hint;
        if (y_hint == "percent") y_params[0].ticks.suggestedMax = 100;
    }

    const ctx = element[0].getContext("2d");
    const chart = new Chart(ctx, {
        type: type,
        data: {
            datasets: [{
                data: dataset,
                backgroundColor:'blue'
            }]
        },
        options: {
            scales: {
                xAxes: x_params,
                yAxes: y_params
            }
        }
    });
}

function createTimeChartWithData(data, labels, element, type)
{
    createChartWithData(data, labels, element, type, "time", "percent");
}