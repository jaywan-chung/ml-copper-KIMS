// Construct Problem-specific Aritifical Neural Networks.
// This is for prediction of strength and conductivity of copper alloys.
// Programmed by Dr. Jaywan Chung
// v0.1 updated on Nov 16, 2023

"use strict";

const jcApp = {
    chartHeight: 500,
    minTime: 0,
    maxTime: 1000,
    nTimeNodes: 101,
    dataLegend: 'Expt',
    plot1Legend: 'Pred 1',
    plot2Legend: 'Pred 2',
    colorRawData: '#594D5B',
    colorPlot1: '#808080',  // gray
    colorPlot2: '#1976D2',  // blue
};

class CopperLann {
    constructor(embeddingNet, f1Net, f2Net) {
        this.dimInputs = 13;
        this.dimSurfaceVars = 2;
        this.dimLatentVars = 6;
        this.dimEmbeddingInput = this.dimInputs - this.dimSurfaceVars;
        this.dimDictionaryVar = this.dimLatentVars + this.dimSurfaceVars;

        this.embeddingNet = embeddingNet;
        this.f1Net = f1Net;
        this.f2Net = f2Net;
        this.embeddingInput = new Matrix(this.dimEmbeddingInput, 1);
        this.dictionaryVar = new Matrix(this.dimDictionaryVar, 1);
        this.latentVar = null;
        this.meanOutputMatrix = new Matrix(2, 1);
        this.stdOutputMatrix = new Matrix(2, 1);
    }
    evaluate(inputMatrix) {
        const scaledInput = CopperLann.getScaledInput(inputMatrix);
        for (let i=0; i<this.dimEmbeddingInput; i++) {
            this.embeddingInput.setElement(i, 0, scaledInput.getElement(i, 0));
        }
        let scaledTime = scaledInput.getElement(this.dimInputs-1, 0);
        this.embeddingNet.evaluate(this.embeddingInput);
        this.latentVar = this.embeddingNet.outputMatrix;
        for (let i=0; i<this.dimLatentVars; i++) {
            this.dictionaryVar.setElement(i, 0, this.latentVar.getElement(i, 0));
        }
        for (let i=this.dimLatentVars; i<this.dimDictionaryVar; i++) {
            this.dictionaryVar.setElement(i, 0, scaledInput.getElement(i+this.dimEmbeddingInput-this.dimLatentVars, 0));
        }
        this.f1Net.evaluate(this.dictionaryVar);
        this.f2Net.evaluate(this.latentVar);
        let f1Output = this.f1Net.outputMatrix;
        let f2Output = this.f2Net.outputMatrix;
        // Update the mean and std
        for (let i=0; i<2; i++) {
            this.meanOutputMatrix.setElement(i, 0, scaledTime * f1Output.getElement(i, 0) + f2Output.getElement(i, 0));
            this.stdOutputMatrix.setElement(i, 0, scaledTime * f1Output.getElement(i+2, 0) + f2Output.getElement(i+2, 0));
        }
        this.scaleOutput();
    }
    static getScaledInput(inputMatrix) {
        const scaledInput = inputMatrix.clone();
        // Input: Ni, Si, Mg, Ti, Cr, Mn, SHT.0, SHT.1, SHT.2, Pre-cold deform.0, Pre-cold deform.1, Aging temp, Aging time
        scaledInput.array[0] /= 2.5;  // Ni
        scaledInput.array[1] /= 0.5;  // Si
        scaledInput.array[2] /= 0.05;  // Mg
        scaledInput.array[3] /= 0.01;  // Ti
        scaledInput.array[4] /= 0.1;  // Cr
        scaledInput.array[5] /= 0.5;  // Mn
        scaledInput.array[6] /= 1.0;  // SHT.0
        scaledInput.array[7] /= 1.0;  // SHT.1
        scaledInput.array[8] /= 1.0;  // SHT.2
        scaledInput.array[9] /= 1.0;  // Pre-cold deform.0
        scaledInput.array[10] /= 1.0;  // Pre-cold deform.1
        scaledInput.array[11] /= 500.0;  // Aging temp
        scaledInput.array[12] = Math.log(1.0 + scaledInput.array[12]);  // Aging time

        return scaledInput;
    }
    scaleOutput() {
        for (let i=0; i<2; i++) {
            let mean = this.meanOutputMatrix.getElement(i, 0);
            let std = this.stdOutputMatrix.getElement(i, 0);
            this.meanOutputMatrix.setElement(i, 0, Math.log(Math.exp(mean) + 1.0));  // softplus activation
            this.stdOutputMatrix.setElement(i, 0, Math.log(Math.exp(std) + 1.0));
        }
        this.meanOutputMatrix.array[0] *= 40.0   // electrical conductivity [%IACS]
        this.meanOutputMatrix.array[1] *= 200.0;  // Vickers hardness [HV]
        this.stdOutputMatrix.array[0] *= 40.0;
        this.stdOutputMatrix.array[1] *= 200.0;
    }
}

class CopperFcnn {
    constructor(fcnn) {
        this.fcnn = fcnn;
        this.meanOutputMatrix = new Matrix(2, 1);
        this.stdOutputMatrix = new Matrix(2, 1);
    }
    evaluate(inputMatrix) {
        const scaledInput = CopperFcnn.getScaledInput(inputMatrix);
        this.fcnn.evaluate(scaledInput);
        let output = this.fcnn.outputMatrix;
        // Update the mean and std
        for (let i=0; i<2; i++) {
            this.meanOutputMatrix.setElement(i, 0, output.getElement(i, 0));
            this.stdOutputMatrix.setElement(i, 0, output.getElement(i+2, 0));
        }
        this.scaleOutput();
    }
    static getScaledInput(inputMatrix) {
        const scaledInput = inputMatrix.clone();
        // Input: Ni, Si, Mg, Ti, Cr, Mn, SHT.0, SHT.1, SHT.2, Pre-cold deform.0, Pre-cold deform.1, Aging temp, Aging time
        scaledInput.array[0] /= 2.5;  // Ni
        scaledInput.array[1] /= 0.5;  // Si
        scaledInput.array[2] /= 0.05;  // Mg
        scaledInput.array[3] /= 0.01;  // Ti
        scaledInput.array[4] /= 0.1;  // Cr
        scaledInput.array[5] /= 0.5;  // Mn
        scaledInput.array[6] /= 1.0;  // SHT.0
        scaledInput.array[7] /= 1.0;  // SHT.1
        scaledInput.array[8] /= 1.0;  // SHT.2
        scaledInput.array[9] /= 1.0;  // Pre-cold deform.0
        scaledInput.array[10] /= 1.0;  // Pre-cold deform.1
        scaledInput.array[11] /= 500.0;  // Aging temp
        scaledInput.array[12] = Math.log(1.0 + scaledInput.array[12]);  // Aging time

        return scaledInput;
    }
    scaleOutput() {
        this.meanOutputMatrix.array[0] *= 40.0   // electrical conductivity [%IACS]
        this.meanOutputMatrix.array[1] *= 200.0;  // Vickers hardness [HV]
        this.stdOutputMatrix.array[0] *= 40.0;
        this.stdOutputMatrix.array[1] *= 200.0;
    }
}

jcApp.startApp = function() {
    console.log("Starting App...");
    jcApp.initSelectRawdata();
    jcApp.initLann();
    jcApp.initFcnn();

    jcApp.timeArray = jcApp.getLinearSpace(jcApp.minTime, jcApp.maxTime, jcApp.nTimeNodes);
    jcApp.plot1Input = new Matrix(13, 1);  // Ni, Si, Mg, Ti, Cr, Mn, SHT.0, SHT.1, SHT.2, Pre-cold deform.0, Pre-cold deform.1, Aging temp, Aging time
    jcApp.plot1HardnessArray = new Float64Array(jcApp.nTimeNodes);
    jcApp.plot1ConductivityArray = new Float64Array(jcApp.nTimeNodes);
    jcApp.plot1HardnessStdArray = new Float64Array(jcApp.nTimeNodes);
    jcApp.plot1ConductivityStdArray = new Float64Array(jcApp.nTimeNodes);
    jcApp.plot1FcnnHardnessArray = new Float64Array(jcApp.nTimeNodes);
    jcApp.plot1FcnnConductivityArray = new Float64Array(jcApp.nTimeNodes);
    jcApp.plot1FcnnHardnessStdArray = new Float64Array(jcApp.nTimeNodes);
    jcApp.plot1FcnnConductivityStdArray = new Float64Array(jcApp.nTimeNodes);
    jcApp.plot2Input = new Matrix(13, 1);
    jcApp.plot2HardnessArray = new Float64Array(jcApp.nTimeNodes);
    jcApp.plot2ConductivityArray = new Float64Array(jcApp.nTimeNodes);
    jcApp.plot2HardnessStdArray = new Float64Array(jcApp.nTimeNodes);
    jcApp.plot2ConductivityStdArray = new Float64Array(jcApp.nTimeNodes);
    jcApp.plot2FcnnHardnessArray = new Float64Array(jcApp.nTimeNodes);
    jcApp.plot2FcnnConductivityArray = new Float64Array(jcApp.nTimeNodes);
    jcApp.plot2FcnnHardnessStdArray = new Float64Array(jcApp.nTimeNodes);
    jcApp.plot2FcnnConductivityStdArray = new Float64Array(jcApp.nTimeNodes);
    console.log('Memory allocated.');

    google.charts.load('current', {'packages':['corechart']});
    google.charts.setOnLoadCallback(jcApp.activateChartsAndButtons); // activate buttons when google charts is loaded.
}

jcApp.initSelectRawdata = function() {
    jcApp.select = document.getElementById("select-rawdata");
    for (const key of Object.keys(jcApp.rawdata)) {
        let opt = document.createElement("option");
        opt.value = key;
        opt.innerHTML = key;
        jcApp.select.appendChild(opt);
    }
    const selectButtonForPlot1 = document.getElementById("select-rawdata-button-for-plot1");
    selectButtonForPlot1.addEventListener("click", jcApp.onClickSelectDataButtonForPlot1);
    const selectButtonForPlot2 = document.getElementById("select-rawdata-button-for-plot2");
    selectButtonForPlot2.addEventListener("click", jcApp.onClickSelectDataButtonForPlot2);
    // select the first data
    // jcApp.select.options[0].selected = true;
    jcApp.select.value = "Ni3.04, Si0.68, Mg0.07, Cr0.10, quenching=air, pre-cold deform=yes, aging=475 degC";
    jcApp.onClickSelectDataButtonForPlot1();
    console.log("'Select Data' initialized.");
}

jcApp.onClickSelectDataButtonForPlot1 = function() {
    let dataName = jcApp.select.value;
    if (!dataName) return;  // if not selected, do nothing.
    let input = jcApp.rawdata[dataName]["input"];
    document.getElementById("plot1-Ni-composition").value = input[0];
    document.getElementById("plot1-Si-composition").value = input[1];
    document.getElementById("plot1-Mg-composition").value = input[2];
    document.getElementById("plot1-Ti-composition").value = input[3];
    document.getElementById("plot1-Cr-composition").value = input[4];
    document.getElementById("plot1-Mn-composition").value = input[5];
    if (input[6]) {   // handle 'input[6], input[7], input[8]'
        document.getElementById("plot1-quenching").value = "No SHT";
    } else if (input[8]) {
        document.getElementById("plot1-quenching").value = "Water";
    } else {
        document.getElementById("plot1-quenching").value = "Air";
    }
    if (input[9]) {  // handle 'input[9], input[10]'
        document.getElementById("plot1-precold-deform").value = "No";
    } else {
        document.getElementById("plot1-precold-deform").value = "Yes";
    }
    document.getElementById("plot1-aging-temp").value = input[11];
}

jcApp.onClickSelectDataButtonForPlot2 = function() {
    let dataName = jcApp.select.value;
    if (!dataName) return;  // if not selected, do nothing.
    let input = jcApp.rawdata[dataName]["input"];
    document.getElementById("plot2-Ni-composition").value = input[0];
    document.getElementById("plot2-Si-composition").value = input[1];
    document.getElementById("plot2-Mg-composition").value = input[2];
    document.getElementById("plot2-Ti-composition").value = input[3];
    document.getElementById("plot2-Cr-composition").value = input[4];
    document.getElementById("plot2-Mn-composition").value = input[5];
    if (input[6]) {   // handle 'input[6], input[7], input[8]'
        document.getElementById("plot2-quenching").value = "No SHT";
    } else if (input[8]) {
        document.getElementById("plot2-quenching").value = "Water";
    } else {
        document.getElementById("plot2-quenching").value = "Air";
    }
    if (input[9]) {  // handle 'input[9], input[10]'
        document.getElementById("plot2-precold-deform").value = "No";
    } else {
        document.getElementById("plot2-precold-deform").value = "Yes";
    }
    document.getElementById("plot2-aging-temp").value = input[11];
}

jcApp.activateChartsAndButtons = function() {
    jcApp.initMatPropCharts();

    document.getElementById("predict-mat-prop").addEventListener("click", function() {
        if (jcApp.predict()) {   // draw chart only when the prediction is successful.
            jcApp.drawCharts();
        } else {
            console.log("Prediction failed.");
        }
    });
}

jcApp.predict = function() {
    jcApp.clearPrediction();

    const plot1NiComposition = parseFloat(document.getElementById("plot1-Ni-composition").value);
    const plot1SiComposition = parseFloat(document.getElementById("plot1-Si-composition").value);
    const plot1MgComposition = parseFloat(document.getElementById("plot1-Mg-composition").value);
    const plot1TiComposition = parseFloat(document.getElementById("plot1-Ti-composition").value);
    const plot1CrComposition = parseFloat(document.getElementById("plot1-Cr-composition").value);
    const plot1MnComposition = parseFloat(document.getElementById("plot1-Mn-composition").value);
    const plot1Quenching = document.getElementById("plot1-quenching").value;
    const plot1PrecoldDeform = document.getElementById("plot1-precold-deform").value;
    const plot1AgingTemp = parseFloat(document.getElementById("plot1-aging-temp").value);

    const plot2NiComposition = parseFloat(document.getElementById("plot2-Ni-composition").value);
    const plot2SiComposition = parseFloat(document.getElementById("plot2-Si-composition").value);
    const plot2MgComposition = parseFloat(document.getElementById("plot2-Mg-composition").value);
    const plot2TiComposition = parseFloat(document.getElementById("plot2-Ti-composition").value);
    const plot2CrComposition = parseFloat(document.getElementById("plot2-Cr-composition").value);
    const plot2MnComposition = parseFloat(document.getElementById("plot2-Mn-composition").value);
    const plot2Quenching = document.getElementById("plot2-quenching").value;
    const plot2PrecoldDeform = document.getElementById("plot2-precold-deform").value;
    const plot2AgingTemp = parseFloat(document.getElementById("plot2-aging-temp").value);

    // check the validity of numbers
    if (!(Number.isFinite(plot1NiComposition) && Number.isFinite(plot1SiComposition) && Number.isFinite(plot1MgComposition) && Number.isFinite(plot1TiComposition) && Number.isFinite(plot1CrComposition) && Number.isFinite(plot1MnComposition))) {
        window.alert("Composition in Pred 1 is not valid!");
        return false;
    }
    if (!(Number.isFinite(plot1AgingTemp))) {
        window.alert("Aging in Pred 1 is not valid!");
        return false;
    }
    if (!(Number.isFinite(plot2NiComposition) && Number.isFinite(plot2SiComposition) && Number.isFinite(plot2MgComposition) && Number.isFinite(plot2TiComposition) && Number.isFinite(plot2CrComposition) && Number.isFinite(plot2MnComposition))) {
        window.alert("Composition in Pred 2 is not valid!");
        return false;
    }
    if (!(Number.isFinite(plot2AgingTemp))) {
        window.alert("Aging in Pred 2 is not valid!");
        return false;
    }
    // check the non-negativity of aging info
    if (plot1AgingTemp < 0) {
        window.alert("Aging params in Pred 1 must be non-negative!");
        return false;
    }
    if (plot2AgingTemp < 0) {
        window.alert("Aging params in Pred 2 must be non-negative!");
        return false;
    }

    // make prediction for Pred 1
    jcApp.plot1Input.setElement(0, 0, plot1NiComposition);
    jcApp.plot1Input.setElement(1, 0, plot1SiComposition);
    jcApp.plot1Input.setElement(2, 0, plot1MgComposition);
    jcApp.plot1Input.setElement(3, 0, plot1TiComposition);
    jcApp.plot1Input.setElement(4, 0, plot1CrComposition);
    jcApp.plot1Input.setElement(5, 0, plot1MnComposition);
    if (plot1Quenching == 'No SHT') {
        jcApp.plot1Input.setElement(6, 0, 1);
        jcApp.plot1Input.setElement(7, 0, 0);
        jcApp.plot1Input.setElement(8, 0, 0);
    } else if (plot1Quenching == 'Water') {
        jcApp.plot1Input.setElement(6, 0, 0);
        jcApp.plot1Input.setElement(7, 0, 0);
        jcApp.plot1Input.setElement(8, 0, 1);
    } else {  // default is 'Air'
        jcApp.plot1Input.setElement(6, 0, 0);
        jcApp.plot1Input.setElement(7, 0, 1);
        jcApp.plot1Input.setElement(8, 0, 0);
    }
    if (plot1PrecoldDeform == 'No') {
        jcApp.plot1Input.setElement(9, 0, 1);
        jcApp.plot1Input.setElement(10, 0, 0);
    } else {  // default is 'Yes'
        jcApp.plot1Input.setElement(9, 0, 0);
        jcApp.plot1Input.setElement(10, 0, 1);
    }
    jcApp.plot1Input.setElement(11, 0, plot1AgingTemp);

    for(let i=0; i<jcApp.nTimeNodes; i++) {
        jcApp.plot1Input.setElement(12, 0, jcApp.timeArray[i]);
        // prediction by LaNN+TL
        jcApp.lann.evaluate(jcApp.plot1Input);
        jcApp.plot1ConductivityArray[i] = jcApp.lann.meanOutputMatrix.array[0];
        jcApp.plot1HardnessArray[i] = jcApp.lann.meanOutputMatrix.array[1];
        jcApp.plot1ConductivityStdArray[i] = jcApp.lann.stdOutputMatrix.array[0];
        jcApp.plot1HardnessStdArray[i] = jcApp.lann.stdOutputMatrix.array[1];
        // prediction by FCNN
        jcApp.fcnn.evaluate(jcApp.plot1Input);
        jcApp.plot1FcnnConductivityArray[i] = jcApp.fcnn.meanOutputMatrix.array[0];
        jcApp.plot1FcnnHardnessArray[i] = jcApp.fcnn.meanOutputMatrix.array[1];
        jcApp.plot1FcnnConductivityStdArray[i] = jcApp.fcnn.stdOutputMatrix.array[0];
        jcApp.plot1FcnnHardnessStdArray[i] = jcApp.fcnn.stdOutputMatrix.array[1];
    }

    // make prediction for Pred 2
    jcApp.plot2Input.setElement(0, 0, plot2NiComposition);
    jcApp.plot2Input.setElement(1, 0, plot2SiComposition);
    jcApp.plot2Input.setElement(2, 0, plot2MgComposition);
    jcApp.plot2Input.setElement(3, 0, plot2TiComposition);
    jcApp.plot2Input.setElement(4, 0, plot2CrComposition);
    jcApp.plot2Input.setElement(5, 0, plot2MnComposition);
    if (plot2Quenching == 'No SHT') {
        jcApp.plot2Input.setElement(6, 0, 1);
        jcApp.plot2Input.setElement(7, 0, 0);
        jcApp.plot2Input.setElement(8, 0, 0);
    } else if (plot2Quenching == 'Water') {
        jcApp.plot2Input.setElement(6, 0, 0);
        jcApp.plot2Input.setElement(7, 0, 0);
        jcApp.plot2Input.setElement(8, 0, 1);
    } else {  // default is 'Air'
        jcApp.plot2Input.setElement(6, 0, 0);
        jcApp.plot2Input.setElement(7, 0, 1);
        jcApp.plot2Input.setElement(8, 0, 0);
    }
    if (plot2PrecoldDeform == 'No') {
        jcApp.plot2Input.setElement(9, 0, 1);
        jcApp.plot2Input.setElement(10, 0, 0);
    } else {  // default is 'Yes'
        jcApp.plot2Input.setElement(9, 0, 0);
        jcApp.plot2Input.setElement(10, 0, 1);
    }
    jcApp.plot2Input.setElement(11, 0, plot2AgingTemp);
    for(let i=0; i<jcApp.nTimeNodes; i++) {
        jcApp.plot2Input.setElement(12, 0, jcApp.timeArray[i]);
        // prediction by LaNN+TL
        jcApp.lann.evaluate(jcApp.plot2Input);
        jcApp.plot2ConductivityArray[i] = jcApp.lann.meanOutputMatrix.array[0];
        jcApp.plot2HardnessArray[i] = jcApp.lann.meanOutputMatrix.array[1];
        jcApp.plot2ConductivityStdArray[i] = jcApp.lann.stdOutputMatrix.array[0];
        jcApp.plot2HardnessStdArray[i] = jcApp.lann.stdOutputMatrix.array[1];
        // prediction by FCNN
        jcApp.fcnn.evaluate(jcApp.plot2Input);
        jcApp.plot2FcnnConductivityArray[i] = jcApp.fcnn.meanOutputMatrix.array[0];
        jcApp.plot2FcnnHardnessArray[i] = jcApp.fcnn.meanOutputMatrix.array[1];
        jcApp.plot2FcnnConductivityStdArray[i] = jcApp.fcnn.stdOutputMatrix.array[0];
        jcApp.plot2FcnnHardnessStdArray[i] = jcApp.fcnn.stdOutputMatrix.array[1];
    }

    console.log("Prediction complete.");

    return true;
}

jcApp.clearPrediction = function() {
    jcApp.plot1Input.fill(NaN);
    jcApp.plot1HardnessArray.fill(NaN);
    jcApp.plot1ConductivityArray.fill(NaN);
    jcApp.plot1FcnnHardnessArray.fill(NaN);
    jcApp.plot1FcnnConductivityArray.fill(NaN);
    jcApp.plot2Input.fill(NaN);
    jcApp.plot2HardnessArray.fill(NaN);
    jcApp.plot2ConductivityArray.fill(NaN);
    jcApp.plot2FcnnHardnessArray.fill(NaN);
    jcApp.plot2FcnnConductivityArray.fill(NaN);

    console.log("Prediction cleared.");
}

jcApp.checkShowOptions = function() {
    jcApp.showData = document.getElementById("show-data").checked;
    jcApp.showPlot1 = document.getElementById("show-plot1").checked;
    jcApp.showPlot1Ci = document.getElementById("show-plot1-ci").checked;
    jcApp.showPlot2 = document.getElementById("show-plot2").checked;
    jcApp.showPlot2Ci = document.getElementById("show-plot2-ci").checked;
}

jcApp.initMatPropCharts = function() {
    jcApp.chartHardness = new google.visualization.ComboChart(document.getElementById('chart-hardness'));
    jcApp.chartConductivity = new google.visualization.ComboChart(document.getElementById('chart-conductivity'));
    jcApp.chartFcnnHardness = new google.visualization.ComboChart(document.getElementById('chart-fcnn-hardness'));
    jcApp.chartFcnnConductivity = new google.visualization.ComboChart(document.getElementById('chart-fcnn-conductivity'));
    console.log("Charts initialized.");
}

jcApp.drawCharts = function() {
    jcApp.checkShowOptions();
    jcApp.drawHardnessChart();
    jcApp.drawConductivityChart();
    // jcApp.drawFcnnHardnessChart();
    // jcApp.drawFcnnConductivityChart();
}

jcApp.drawHardnessChart = function() {
    const chart = jcApp.chartHardness;
    const xLabel = "Aging time (min)";
    const yLabel = "Vickers Hardness (HV)";
    const yScale = 1.0;   // [HV]
    const selectedDataName = jcApp.select.value;

    let data = new google.visualization.DataTable();
    data.addColumn('number', xLabel); 
    data.addColumn('number', jcApp.dataLegend);
    data.addColumn('number', jcApp.plot1Legend);
    data.addColumn({type: 'number', role: 'interval'});
    data.addColumn({type: 'number', role: 'interval'});
    data.addColumn('number', jcApp.plot2Legend);
    data.addColumn({type: 'number', role: 'interval'});
    data.addColumn({type: 'number', role: 'interval'});

    if(selectedDataName && jcApp.showData) {
        let timeData = jcApp.rawdata[selectedDataName]["time [min]"];
        let propData = jcApp.rawdata[selectedDataName]["hardness [HV]"];
        for(let i=0; i<timeData.length; i++) {
            data.addRow([timeData[i], propData[i]*yScale, NaN, NaN, NaN, NaN, NaN, NaN]);
        }    
    }
    let plot1Mean, plot1Std, plot2Mean, plot2Std;
    for(let i=0; i<jcApp.nTimeNodes; i++) {
        plot1Mean = plot1Std = plot2Mean = plot2Std = NaN;
        if(jcApp.showPlot1) {
            plot1Mean = jcApp.plot1HardnessArray[i]*yScale;
        }
        if(jcApp.showPlot1Ci) {
            plot1Std = jcApp.plot1HardnessStdArray[i]*yScale;
        }
        if(jcApp.showPlot2) {
            plot2Mean = jcApp.plot2HardnessArray[i]*yScale;
        }
        if(jcApp.showPlot2Ci) {
            plot2Std = jcApp.plot2HardnessStdArray[i]*yScale;
        }
        data.addRow([jcApp.timeArray[i], NaN,
            plot1Mean, plot1Mean-1.96*plot1Std, plot1Mean+1.96*plot1Std,
            plot2Mean, plot2Mean-1.96*plot2Std, plot2Mean+1.96*plot2Std]);
    }

    let options = {
      seriesType: 'line',
      series: {0: {type: 'scatter'}},
      title: yLabel,
      titleTextStyle: {bold: true, fontSize: 20,},
      hAxis: {title: xLabel, titleTextStyle: {italic: false, fontSize: 15,}, viewWindow: {min: -1.0}},
      vAxis: {title: yLabel, titleTextStyle: {italic: false, fontSize: 15,},},
      legend: { position: 'bottom', alignment: 'center' },
      intervals: { style: 'area' },
      colors: [jcApp.colorRawData, jcApp.colorPlot1, jcApp.colorPlot2],
      height: jcApp.chartHeight,
    };
  
    chart.draw(data, options);
};

jcApp.drawConductivityChart = function() {
    const chart = jcApp.chartConductivity;
    const xLabel = "Aging time (min)";
    const yLabel = "Conductivity (%IACS)";
    const yScale = 1.0;   // [%IACS]
    const selectedDataName = jcApp.select.value;

    let data = new google.visualization.DataTable();
    data.addColumn('number', xLabel); 
    data.addColumn('number', jcApp.dataLegend);
    data.addColumn('number', jcApp.plot1Legend);
    data.addColumn({type: 'number', role: 'interval'});
    data.addColumn({type: 'number', role: 'interval'});
    data.addColumn('number', jcApp.plot2Legend);
    data.addColumn({type: 'number', role: 'interval'});
    data.addColumn({type: 'number', role: 'interval'});

    if(selectedDataName && jcApp.showData) {
        let timeData = jcApp.rawdata[selectedDataName]["time [min]"];
        let propData = jcApp.rawdata[selectedDataName]["conductivity [%IACS]"];
        for(let i=0; i<timeData.length; i++) {
            data.addRow([timeData[i], propData[i]*yScale, NaN, NaN, NaN, NaN, NaN, NaN]);
        }    
    }
    let plot1Mean, plot1Std, plot2Mean, plot2Std;
    for(let i=0; i<jcApp.nTimeNodes; i++) {
        plot1Mean = plot1Std = plot2Mean = plot2Std = NaN;
        if(jcApp.showPlot1) {
            plot1Mean = jcApp.plot1ConductivityArray[i]*yScale;
        }
        if(jcApp.showPlot1Ci) {
            plot1Std = jcApp.plot1ConductivityStdArray[i]*yScale;
        }
        if(jcApp.showPlot2) {
            plot2Mean = jcApp.plot2ConductivityArray[i]*yScale;
        }
        if(jcApp.showPlot2Ci) {
            plot2Std = jcApp.plot2ConductivityStdArray[i]*yScale;
        }
        data.addRow([jcApp.timeArray[i], NaN,
            plot1Mean, plot1Mean-1.96*plot1Std, plot1Mean+1.96*plot1Std,
            plot2Mean, plot2Mean-1.96*plot2Std, plot2Mean+1.96*plot2Std]);
    }

    let options = {
      seriesType: 'line',
      series: {0: {type: 'scatter'}},
      title: yLabel,
      titleTextStyle: {bold: true, fontSize: 20,},
      hAxis: {title: xLabel, titleTextStyle: {italic: false, fontSize: 15,}, viewWindow: {min: -1.0}},
      vAxis: {title: yLabel, titleTextStyle: {italic: false, fontSize: 15,},},
      legend: { position: 'bottom', alignment: 'center' },
      intervals: { style: 'area' },
      colors: [jcApp.colorRawData, jcApp.colorPlot1, jcApp.colorPlot2],
      height: jcApp.chartHeight,
    };
  
    chart.draw(data, options);
};

jcApp.drawFcnnHardnessChart = function() {
    const chart = jcApp.chartFcnnHardness;
    const xLabel = "Aging time (min)";
    const yLabel = "Vickers Hardness (HV)";
    const yScale = 1.0;   // [HV]
    const selectedDataName = jcApp.select.value;

    let data = new google.visualization.DataTable();
    data.addColumn('number', xLabel); 
    data.addColumn('number', jcApp.dataLegend);
    data.addColumn('number', jcApp.plot1Legend);
    data.addColumn({type: 'number', role: 'interval'});
    data.addColumn({type: 'number', role: 'interval'});
    data.addColumn('number', jcApp.plot2Legend);
    data.addColumn({type: 'number', role: 'interval'});
    data.addColumn({type: 'number', role: 'interval'});

    if(selectedDataName && jcApp.showData) {
        let timeData = jcApp.rawdata[selectedDataName]["time [min]"];
        let propData = jcApp.rawdata[selectedDataName]["hardness [HV]"];
        for(let i=0; i<timeData.length; i++) {
            data.addRow([timeData[i], propData[i]*yScale, NaN, NaN, NaN, NaN, NaN, NaN]);
        }    
    }
    let plot1Mean, plot1Std, plot2Mean, plot2Std;
    for(let i=0; i<jcApp.nTimeNodes; i++) {
        plot1Mean = plot1Std = plot2Mean = plot2Std = NaN;
        if(jcApp.showPlot1) {
            plot1Mean = jcApp.plot1FcnnHardnessArray[i]*yScale;
        }
        if(jcApp.showPlot1Ci) {
            plot1Std = jcApp.plot1FcnnHardnessStdArray[i]*yScale;
        }
        if(jcApp.showPlot2) {
            plot2Mean = jcApp.plot2FcnnHardnessArray[i]*yScale;
        }
        if(jcApp.showPlot2Ci) {
            plot2Std = jcApp.plot2FcnnHardnessStdArray[i]*yScale;
        }
        data.addRow([jcApp.timeArray[i], NaN,
            plot1Mean, plot1Mean-1.96*plot1Std, plot1Mean+1.96*plot1Std,
            plot2Mean, plot2Mean-1.96*plot2Std, plot2Mean+1.96*plot2Std]);
    }

    let options = {
      seriesType: 'line',
      series: {0: {type: 'scatter'}},
      title: yLabel,
      titleTextStyle: {bold: true, fontSize: 20,},
      hAxis: {title: xLabel, titleTextStyle: {italic: false, fontSize: 15,}, viewWindow: {min: -1.0}},
      vAxis: {title: yLabel, titleTextStyle: {italic: false, fontSize: 15,},},
      legend: { position: 'bottom', alignment: 'center' },
      intervals: { style: 'area' },
      colors: [jcApp.colorRawData, jcApp.colorPlot1, jcApp.colorPlot2],
      height: jcApp.chartHeight,
    };
  
    chart.draw(data, options);
};

jcApp.drawFcnnConductivityChart = function() {
    const chart = jcApp.chartFcnnConductivity;
    const xLabel = "Aging time (min)";
    const yLabel = "Conductivity (%IACS)";
    const yScale = 1.0;   // [%IACS]
    const selectedDataName = jcApp.select.value;

    let data = new google.visualization.DataTable();
    data.addColumn('number', xLabel); 
    data.addColumn('number', jcApp.dataLegend);
    data.addColumn('number', jcApp.plot1Legend);
    data.addColumn({type: 'number', role: 'interval'});
    data.addColumn({type: 'number', role: 'interval'});
    data.addColumn('number', jcApp.plot2Legend);
    data.addColumn({type: 'number', role: 'interval'});
    data.addColumn({type: 'number', role: 'interval'});

    if(selectedDataName && jcApp.showData) {
        let timeData = jcApp.rawdata[selectedDataName]["time [min]"];
        let propData = jcApp.rawdata[selectedDataName]["conductivity [%IACS]"];
        for(let i=0; i<timeData.length; i++) {
            data.addRow([timeData[i], propData[i]*yScale, NaN, NaN, NaN, NaN, NaN, NaN]);
        }    
    }
    let plot1Mean, plot1Std, plot2Mean, plot2Std;
    for(let i=0; i<jcApp.nTimeNodes; i++) {
        plot1Mean = plot1Std = plot2Mean = plot2Std = NaN;
        if(jcApp.showPlot1) {
            plot1Mean = jcApp.plot1FcnnConductivityArray[i]*yScale;
        }
        if(jcApp.showPlot1Ci) {
            plot1Std = jcApp.plot1FcnnConductivityStdArray[i]*yScale;
        }
        if(jcApp.showPlot2) {
            plot2Mean = jcApp.plot2FcnnConductivityArray[i]*yScale;
        }
        if(jcApp.showPlot2Ci) {
            plot2Std = jcApp.plot2FcnnConductivityStdArray[i]*yScale;
        }
        data.addRow([jcApp.timeArray[i], NaN,
            plot1Mean, plot1Mean-1.96*plot1Std, plot1Mean+1.96*plot1Std,
            plot2Mean, plot2Mean-1.96*plot2Std, plot2Mean+1.96*plot2Std]);
    }

    let options = {
      seriesType: 'line',
      series: {0: {type: 'scatter'}},
      title: yLabel,
      titleTextStyle: {bold: true, fontSize: 20,},
      hAxis: {title: xLabel, titleTextStyle: {italic: false, fontSize: 15,}, viewWindow: {min: -1.0}},
      vAxis: {title: yLabel, titleTextStyle: {italic: false, fontSize: 15,},},
      legend: { position: 'bottom', alignment: 'center' },
      intervals: { style: 'area' },
      colors: [jcApp.colorRawData, jcApp.colorPlot1, jcApp.colorPlot2],
      height: jcApp.chartHeight,
    };
  
    chart.draw(data, options);
};


jcApp.initLann = function() {
    let jsonObj = jcApp.jsonObjKimsLann;
    let embeddingNet = new FullyConnectedNeuralNetwork(11,  // 13 inputs - 2 surface vars
        jsonObj["embeddingNet"]["weightsArray"],
        jsonObj["embeddingNet"]["biasesArray"],
        jsonObj["embeddingNet"]["activationArray"]
    );
     let f1Net = new FullyConnectedNeuralNetwork(8,  // 6 latent vars + 2 surface vars
        jsonObj["f1Net"]["weightsArray"],
        jsonObj["f1Net"]["biasesArray"],
        jsonObj["f1Net"]["activationArray"]
    );
    let f2Net = new FullyConnectedNeuralNetwork(6,  // 6 latent vars
        jsonObj["f2Net"]["weightsArray"],
        jsonObj["f2Net"]["biasesArray"],
        jsonObj["f2Net"]["activationArray"]
    );
    jcApp.lann = new CopperLann(embeddingNet, f1Net, f2Net);
    console.log("Machine learning model (LaNN) initialized.");
};

jcApp.initFcnn = function() {
    let jsonObj = jcApp.jsonObjKimsFcnn;
    let fcnn = new FullyConnectedNeuralNetwork(13,  // 13 inputs
        jsonObj["FCNN"]["weightsArray"],
        jsonObj["FCNN"]["biasesArray"],
        jsonObj["FCNN"]["activationArray"]
    );
    jcApp.fcnn = new CopperFcnn(fcnn);
    console.log("Machine learning model (FCNN) initialized.");
};

jcApp.getLinearSpace = function(x0, xf, numNodes) {
    const vec = new Float64Array(numNodes);
    const dx = (xf-x0)/(numNodes-1);
    for(let i=0; i<vec.length; i++) {
        vec[i] = (x0 + dx*i);
    };
    vec[vec.length-1] = xf;

    return vec;
};

// Models and Data


jcApp.rawdata = {"Ni2.78, Si0.80, Mn0.50, quenching=water, pre-cold deform=no, aging=425 degC": {"input": [2.78, 0.8, 0.0, 0.0, 0.0, 0.5, 0.0, 0.0, 1.0, 1.0, 0.0, 425.0], "time [min]": [2880.0, 60.0, 2880.0, 1440.0, 5760.0, 1440.0, 180.0, 2880.0, 180.0, 5760.0, 60.0, 180.0, 5760.0, 1440.0, 60.0], "conductivity [%IACS]": [29.8, 22.7, 29.0, 27.8, 30.7, 28.3, 24.2, 29.0, 23.9, 31.4, 23.0, 24.8, 30.7, 27.5, 22.7], "hardness [HV]": [211.754, 148.994, 221.51, 208.051, 230.06, 190.338, 148.869, 234.11, 156.15200000000004, 228.52, 146.016, 167.22, 237.65, 215.363, 150.725]}, "Ni2.78, Si0.80, Mn0.50, quenching=water, pre-cold deform=no, aging=500 degC": {"input": [2.78, 0.8, 0.0, 0.0, 0.0, 0.5, 0.0, 0.0, 1.0, 1.0, 0.0, 500.0], "time [min]": [720.0, 1440.0, 1440.0, 720.0, 30.0, 30.0, 60.0, 720.0, 1440.0, 60.0, 180.0, 60.0, 30.0, 180.0, 180.0], "conductivity [%IACS]": [31.1, 32.3, 32.5, 31.1, 25.7, 26.2, 26.8, 30.8, 31.9, 27.6, 29.1, 27.3, 26.3, 28.9, 29.2], "hardness [HV]": [223.823, 200.755, 206.495, 226.977, 208.018, 198.233, 223.132, 208.641, 201.767, 215.667, 224.962, 207.982, 203.183, 233.112, 237.977]}, "Ni2.78, Si0.80, Mn0.50, quenching=water, pre-cold deform=no, aging=575 degC": {"input": [2.78, 0.8, 0.0, 0.0, 0.0, 0.5, 0.0, 0.0, 1.0, 1.0, 0.0, 575.0], "time [min]": [30.0, 1440.0, 10.0, 10.0, 1440.0, 5.0, 30.0, 5.0, 60.0, 60.0, 10.0, 5.0, 30.0, 60.0, 1440.0], "conductivity [%IACS]": [27.3, 31.6, 25.3, 24.7, 31.7, 25.5, 27.6, 24.5, 28.4, 28.3, 25.0, 25.0, 27.4, 28.5, 31.5], "hardness [HV]": [217.008, 138.871, 211.93, 216.971, 139.85399999999998, 213.106, 238.656, 187.008, 217.4, 203.689, 218.377, 199.247, 229.858, 217.456, 139.094]}, "Ni2.85, Si0.60, Mg0.09, Ti0.05, Cr0.11, quenching=air, pre-cold deform=yes, aging=425 degC": {"input": [2.85, 0.6, 0.09, 0.05, 0.11, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 425.0], "time [min]": [160.0, 10.0, 80.0, 20.0, 360.0, 5.0, 40.0], "conductivity [%IACS]": [36.95, 26.03, 32.12, 30.29, 49.36, 25.06, 31.95], "hardness [HV]": [249.34, 187.86, 245.22, 209.64, 240.04, 175.58, 223.1]}, "Ni2.85, Si0.60, Mg0.09, Ti0.05, Cr0.11, quenching=air, pre-cold deform=yes, aging=450 degC": {"input": [2.85, 0.6, 0.09, 0.05, 0.11, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 450.0], "time [min]": [160.0, 10.0, 40.0, 20.0, 80.0, 360.0, 5.0], "conductivity [%IACS]": [49.09, 33.73, 42.22, 37.39, 46.01, 53.08, 31.51], "hardness [HV]": [258.18, 199.78, 246.46, 231.9, 252.14, 261.5, 180.52]}, "Ni2.85, Si0.60, Mg0.09, Ti0.05, Cr0.11, quenching=air, pre-cold deform=yes, aging=475 degC": {"input": [2.85, 0.6, 0.09, 0.05, 0.11, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 475.0], "time [min]": [5.0, 360.0, 20.0, 160.0, 40.0, 80.0, 10.0], "conductivity [%IACS]": [35.19, 56.46, 41.5, 52.62, 45.88, 49.33, 35.29], "hardness [HV]": [195.58, 256.28, 249.16, 270.76, 251.58, 264.1, 218.86]}, "Ni2.88, Si0.62, Mg0.08, Ti0.03, Cr0.11, quenching=no SHT, pre-cold deform=no, aging=400 degC": {"input": [2.88, 0.62, 0.08, 0.027000000000000003, 0.11, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 400.0], "time [min]": [720.0, 5.0, 10.0, 80.0, 160.0, 20.0, 10.0, 80.0, 160.0, 360.0, 360.0, 40.0, 40.0, 720.0, 20.0, 5.0], "conductivity [%IACS]": [42.7, 27.4, 28.0, 34.7, 36.3, 29.5, 28.0, 34.7, 36.3, 39.2, 39.2, 32.4, 32.4, 42.7, 29.5, 27.4], "hardness [HV]": [246.3, 206.9, 207.8, 226.7, 239.1, 212.6, 207.8, 226.7, 239.1, 231.8, 231.8, 222.6, 222.6, 246.3, 212.6, 206.9]}, "Ni2.88, Si0.62, Mg0.08, Ti0.03, Cr0.11, quenching=no SHT, pre-cold deform=no, aging=425 degC": {"input": [2.88, 0.62, 0.08, 0.027000000000000003, 0.11, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 425.0], "time [min]": [720.0, 10.0, 720.0, 20.0, 20.0, 80.0, 360.0, 160.0, 40.0, 10.0, 5.0, 160.0, 40.0, 5.0, 360.0, 80.0], "conductivity [%IACS]": [47.0, 25.9, 47.0, 27.7, 27.7, 36.7, 44.8, 41.9, 33.8, 25.9, 25.2, 41.9, 33.8, 25.2, 44.8, 36.7], "hardness [HV]": [240.9, 195.6, 240.9, 217.7, 217.7, 248.8, 239.9, 243.4, 224.6, 195.6, 195.6, 243.4, 224.6, 195.6, 239.9, 248.8]}, "Ni2.88, Si0.62, Mg0.08, Ti0.03, Cr0.11, quenching=no SHT, pre-cold deform=no, aging=450 degC": {"input": [2.88, 0.62, 0.08, 0.027000000000000003, 0.11, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 450.0], "time [min]": [5.0, 80.0, 360.0, 10.0, 720.0, 20.0, 10.0, 160.0, 40.0, 80.0, 360.0, 20.0, 720.0, 160.0, 5.0, 40.0], "conductivity [%IACS]": [25.6, 40.8, 48.4, 25.8, 52.9, 30.4, 25.8, 44.5, 37.6, 40.8, 48.4, 30.4, 52.9, 44.5, 25.6, 37.6], "hardness [HV]": [196.7, 249.0, 245.1, 201.44, 230.5, 228.0, 201.44, 251.9, 249.3, 249.0, 245.1, 228.0, 230.5, 251.9, 196.7, 249.3]}, "Ni2.88, Si0.62, Mg0.08, Ti0.03, Cr0.11, quenching=no SHT, pre-cold deform=no, aging=475 degC": {"input": [2.88, 0.62, 0.08, 0.027000000000000003, 0.11, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 475.0], "time [min]": [20.0, 80.0, 10.0, 720.0, 160.0, 10.0, 40.0, 20.0, 5.0, 160.0, 360.0, 720.0, 5.0, 40.0, 80.0, 360.0], "conductivity [%IACS]": [34.3, 43.6, 27.2, 55.5, 47.7, 27.2, 38.5, 34.3, 25.6, 47.7, 49.8, 55.5, 25.6, 38.5, 43.6, 49.8], "hardness [HV]": [224.8, 253.1, 209.9, 193.6, 236.1, 209.9, 248.6, 224.8, 207.4, 236.1, 239.4, 193.6, 207.4, 248.6, 253.1, 239.4]}, "Ni2.88, Si0.62, Mg0.08, Ti0.03, Cr0.11, quenching=no SHT, pre-cold deform=no, aging=500 degC": {"input": [2.88, 0.62, 0.08, 0.027000000000000003, 0.11, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 500.0], "time [min]": [360.0, 80.0, 5.0, 160.0, 720.0, 20.0, 5.0, 40.0, 720.0, 80.0, 10.0, 360.0, 20.0, 10.0, 160.0, 40.0], "conductivity [%IACS]": [51.8, 49.0, 34.4, 49.1, 56.1, 41.8, 34.4, 44.1, 56.1, 49.0, 38.3, 51.8, 41.8, 38.3, 49.1, 44.1], "hardness [HV]": [205.6, 205.8, 236.2, 220.7, 168.1, 240.1, 236.2, 240.8, 168.1, 205.8, 243.9, 205.6, 240.1, 243.9, 220.7, 240.8]}, "Ni2.88, Si0.62, Mg0.08, Ti0.03, Cr0.11, quenching=no SHT, pre-cold deform=no, aging=525 degC": {"input": [2.88, 0.62, 0.08, 0.027000000000000003, 0.11, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 525.0], "time [min]": [360.0, 720.0, 160.0, 10.0, 40.0, 80.0, 20.0, 360.0, 160.0, 10.0, 5.0, 20.0, 720.0, 80.0, 40.0, 5.0], "conductivity [%IACS]": [53.5, 55.8, 51.0, 31.6, 44.1, 47.5, 40.3, 53.5, 51.0, 31.6, 26.4, 40.3, 55.8, 47.5, 44.1, 26.4], "hardness [HV]": [171.3, 145.2, 186.1, 232.5, 231.7, 221.5, 244.9, 171.3, 186.1, 232.5, 212.3, 244.9, 145.2, 221.5, 231.7, 212.3]}, "Ni2.89, Si0.62, Mg0.11, Ti0.04, quenching=no SHT, pre-cold deform=no, aging=400 degC": {"input": [2.89, 0.62, 0.11, 0.037000000000000005, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 400.0], "time [min]": [5.0, 160.0, 360.0, 10.0, 720.0, 20.0, 40.0, 160.0, 20.0, 80.0, 80.0, 10.0, 40.0, 5.0, 720.0, 360.0], "conductivity [%IACS]": [28.2, 36.3, 40.7, 28.8, 41.9, 30.1, 32.3, 36.3, 30.1, 34.8, 34.8, 28.8, 32.3, 28.2, 41.9, 40.7], "hardness [HV]": [182.1, 209.2, 212.9, 181.0, 233.5, 191.1, 199.5, 209.2, 191.1, 202.3, 202.3, 181.0, 199.5, 182.1, 233.5, 212.9]}, "Ni2.89, Si0.62, Mg0.11, Ti0.04, quenching=no SHT, pre-cold deform=no, aging=425 degC": {"input": [2.89, 0.62, 0.11, 0.037000000000000005, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 425.0], "time [min]": [160.0, 5.0, 80.0, 360.0, 20.0, 160.0, 10.0, 5.0, 40.0, 10.0, 80.0, 20.0, 360.0, 720.0, 40.0, 720.0], "conductivity [%IACS]": [42.5, 26.4, 37.6, 45.3, 28.8, 42.5, 28.3, 26.4, 33.8, 28.3, 37.6, 28.8, 45.3, 49.0, 33.8, 49.0], "hardness [HV]": [227.6, 183.0, 212.9, 234.0, 183.2, 227.6, 188.7, 183.0, 203.4, 188.7, 212.9, 183.2, 234.0, 228.6, 203.4, 228.6]}, "Ni2.89, Si0.62, Mg0.11, Ti0.04, quenching=no SHT, pre-cold deform=no, aging=450 degC": {"input": [2.89, 0.62, 0.11, 0.037000000000000005, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 450.0], "time [min]": [360.0, 720.0, 40.0, 20.0, 160.0, 10.0, 20.0, 80.0, 160.0, 40.0, 80.0, 5.0, 360.0, 5.0, 720.0, 10.0], "conductivity [%IACS]": [47.9, 52.7, 37.9, 31.5, 45.2, 27.9, 31.5, 41.9, 45.2, 37.9, 41.9, 26.1, 47.9, 26.1, 52.7, 27.9], "hardness [HV]": [228.8, 221.9, 219.2, 198.2, 234.5, 184.0, 198.2, 237.2, 234.5, 219.2, 237.2, 187.7, 228.8, 187.7, 221.9, 184.0]}, "Ni2.89, Si0.62, Mg0.11, Ti0.04, quenching=no SHT, pre-cold deform=no, aging=475 degC": {"input": [2.89, 0.62, 0.11, 0.037000000000000005, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 475.0], "time [min]": [80.0, 360.0, 5.0, 80.0, 720.0, 20.0, 40.0, 720.0, 5.0, 360.0, 10.0, 20.0, 160.0, 40.0, 10.0, 160.0], "conductivity [%IACS]": [43.7, 49.8, 27.1, 43.7, 53.3, 35.2, 38.1, 53.3, 27.1, 49.8, 28.6, 35.2, 47.8, 38.1, 28.6, 47.8], "hardness [HV]": [230.1, 229.7, 187.7, 230.1, 209.0, 216.0, 224.0, 209.0, 187.7, 229.7, 195.4, 216.0, 230.3, 224.0, 195.4, 230.3]}, "Ni2.89, Si0.62, Mg0.11, Ti0.04, quenching=no SHT, pre-cold deform=no, aging=500 degC": {"input": [2.89, 0.62, 0.11, 0.037000000000000005, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 500.0], "time [min]": [720.0, 20.0, 360.0, 720.0, 20.0, 40.0, 40.0, 10.0, 10.0, 160.0, 80.0, 5.0, 5.0, 360.0, 160.0, 80.0], "conductivity [%IACS]": [53.9, 41.9, 51.9, 53.9, 41.9, 44.1, 44.1, 37.4, 37.4, 48.3, 48.7, 34.1, 34.1, 51.9, 48.3, 48.7], "hardness [HV]": [189.8, 225.4, 203.8, 189.8, 225.4, 229.6, 229.6, 225.7, 225.7, 219.8, 215.4, 220.5, 220.5, 203.8, 219.8, 215.4]}, "Ni2.89, Si0.62, Mg0.11, Ti0.04, quenching=no SHT, pre-cold deform=no, aging=525 degC": {"input": [2.89, 0.62, 0.11, 0.037000000000000005, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 525.0], "time [min]": [20.0, 80.0, 10.0, 5.0, 5.0, 360.0, 160.0, 720.0, 720.0, 160.0, 40.0, 20.0, 40.0, 360.0, 80.0, 10.0], "conductivity [%IACS]": [40.4, 46.8, 31.7, 27.8, 27.8, 51.9, 49.7, 53.5, 53.5, 49.7, 43.8, 40.4, 43.8, 51.9, 46.8, 31.7], "hardness [HV]": [223.0, 210.2, 209.5, 188.1, 188.1, 171.9, 189.3, 171.5, 171.5, 189.3, 225.4, 223.0, 225.4, 171.9, 210.2, 209.5]}, "Ni2.90, Si0.63, Ti0.03, Cr0.01, quenching=no SHT, pre-cold deform=no, aging=400 degC": {"input": [2.9, 0.63, 0.0, 0.028, 0.01, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 400.0], "time [min]": [160.0, 40.0, 720.0, 360.0, 20.0, 10.0, 5.0, 80.0], "conductivity [%IACS]": [36.2, 32.1, 45.4, 39.8, 30.3, 28.7, 27.9, 34.6], "hardness [HV]": [218.9, 201.8, 228.4, 219.4, 191.4, 195.4, 184.3, 214.5]}, "Ni2.90, Si0.63, Ti0.03, Cr0.01, quenching=no SHT, pre-cold deform=no, aging=425 degC": {"input": [2.9, 0.63, 0.0, 0.028, 0.01, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 425.0], "time [min]": [40.0, 5.0, 720.0, 80.0, 10.0, 160.0, 20.0, 360.0], "conductivity [%IACS]": [33.6, 26.7, 52.8, 37.0, 27.1, 42.7, 28.6, 48.0], "hardness [HV]": [211.9, 180.0, 209.6, 219.1, 179.4, 229.4, 188.6, 224.2]}, "Ni2.90, Si0.63, Ti0.03, Cr0.01, quenching=no SHT, pre-cold deform=no, aging=450 degC": {"input": [2.9, 0.63, 0.0, 0.028, 0.01, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 450.0], "time [min]": [160.0, 40.0, 20.0, 360.0, 80.0, 10.0, 720.0, 5.0], "conductivity [%IACS]": [47.3, 37.7, 30.1, 52.5, 42.2, 27.2, 56.4, 26.5], "hardness [HV]": [222.4, 230.0, 211.0, 206.1, 230.2, 191.1, 184.9, 183.9]}, "Ni2.90, Si0.63, Ti0.03, Cr0.01, quenching=no SHT, pre-cold deform=no, aging=475 degC": {"input": [2.9, 0.63, 0.0, 0.028, 0.01, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 475.0], "time [min]": [360.0, 10.0, 80.0, 160.0, 720.0, 40.0, 20.0, 5.0], "conductivity [%IACS]": [53.0, 27.8, 45.0, 50.1, 59.0, 38.1, 34.3, 26.6], "hardness [HV]": [213.9, 198.1, 232.9, 209.4, 161.0, 231.6, 219.7, 192.1]}, "Ni2.90, Si0.63, Ti0.03, Cr0.01, quenching=no SHT, pre-cold deform=no, aging=500 degC": {"input": [2.9, 0.63, 0.0, 0.028, 0.01, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 500.0], "time [min]": [10.0, 20.0, 80.0, 360.0, 40.0, 160.0, 5.0, 720.0], "conductivity [%IACS]": [38.0, 42.5, 51.0, 55.6, 44.7, 51.6, 34.2, 58.1], "hardness [HV]": [225.5, 230.4, 193.5, 184.3, 217.0, 192.3, 212.4, 141.5]}, "Ni2.90, Si0.63, Ti0.03, Cr0.01, quenching=no SHT, pre-cold deform=no, aging=525 degC": {"input": [2.9, 0.63, 0.0, 0.028, 0.01, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 525.0], "time [min]": [20.0, 360.0, 40.0, 160.0, 720.0, 80.0, 5.0, 10.0], "conductivity [%IACS]": [40.3, 55.1, 45.7, 52.2, 58.2, 49.9, 27.3, 31.4], "hardness [HV]": [231.4, 153.6, 213.7, 157.6, 129.1, 192.9, 209.1, 200.9]}, "Ni2.90, Si0.63, Ti0.03, Cr0.10, quenching=no SHT, pre-cold deform=no, aging=400 degC": {"input": [2.9, 0.63, 0.0, 0.028, 0.1, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 400.0], "time [min]": [360.0, 5.0, 20.0, 720.0, 10.0, 160.0, 80.0, 40.0], "conductivity [%IACS]": [39.8, 27.9, 30.3, 45.4, 28.7, 36.2, 34.6, 32.1], "hardness [HV]": [219.4, 184.3, 191.4, 228.4, 195.4, 218.9, 214.5, 201.8]}, "Ni2.90, Si0.63, Ti0.03, Cr0.10, quenching=no SHT, pre-cold deform=no, aging=425 degC": {"input": [2.9, 0.63, 0.0, 0.028, 0.1, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 425.0], "time [min]": [40.0, 80.0, 720.0, 20.0, 5.0, 160.0, 360.0, 10.0], "conductivity [%IACS]": [33.6, 37.0, 52.8, 28.6, 26.7, 42.7, 48.0, 27.1], "hardness [HV]": [211.9, 219.1, 209.6, 188.6, 180.0, 229.4, 224.2, 179.4]}, "Ni2.90, Si0.63, Ti0.03, Cr0.10, quenching=no SHT, pre-cold deform=no, aging=450 degC": {"input": [2.9, 0.63, 0.0, 0.028, 0.1, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 450.0], "time [min]": [20.0, 160.0, 80.0, 40.0, 10.0, 5.0, 720.0, 360.0], "conductivity [%IACS]": [30.1, 47.3, 42.2, 37.7, 27.2, 26.5, 56.4, 52.5], "hardness [HV]": [211.0, 222.4, 230.2, 230.0, 191.1, 183.9, 184.9, 206.1]}, "Ni2.90, Si0.63, Ti0.03, Cr0.10, quenching=no SHT, pre-cold deform=no, aging=475 degC": {"input": [2.9, 0.63, 0.0, 0.028, 0.1, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 475.0], "time [min]": [720.0, 160.0, 10.0, 40.0, 5.0, 80.0, 20.0, 360.0], "conductivity [%IACS]": [59.0, 50.1, 27.8, 38.1, 26.6, 45.0, 34.3, 53.0], "hardness [HV]": [161.0, 209.4, 198.1, 231.6, 192.1, 232.9, 219.7, 213.9]}, "Ni2.90, Si0.63, Ti0.03, Cr0.10, quenching=no SHT, pre-cold deform=no, aging=500 degC": {"input": [2.9, 0.63, 0.0, 0.028, 0.1, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 500.0], "time [min]": [80.0, 40.0, 720.0, 10.0, 20.0, 160.0, 5.0, 360.0], "conductivity [%IACS]": [51.0, 44.7, 58.1, 38.0, 42.5, 51.6, 34.2, 55.6], "hardness [HV]": [193.5, 217.0, 141.5, 225.5, 230.4, 192.3, 212.4, 184.3]}, "Ni2.90, Si0.63, Ti0.03, Cr0.10, quenching=no SHT, pre-cold deform=no, aging=525 degC": {"input": [2.9, 0.63, 0.0, 0.028, 0.1, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 525.0], "time [min]": [360.0, 160.0, 80.0, 720.0, 10.0, 40.0, 20.0, 5.0], "conductivity [%IACS]": [55.1, 52.2, 49.9, 58.2, 31.4, 45.7, 40.3, 27.3], "hardness [HV]": [153.6, 157.6, 192.9, 129.1, 200.9, 213.7, 231.4, 209.1]}, "Ni2.90, Si0.64, Mg0.05, Cr0.11, quenching=air, pre-cold deform=yes, aging=425 degC": {"input": [2.9, 0.64, 0.05, 0.0, 0.11, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 425.0], "time [min]": [160.0, 5.0, 20.0, 40.0, 360.0, 80.0, 10.0], "conductivity [%IACS]": [43.67, 28.63, 32.0, 32.93, 50.6, 38.67, 30.07], "hardness [HV]": [234.34, 197.92, 212.2, 210.24, 236.38, 217.78, 200.02]}, "Ni2.90, Si0.64, Mg0.05, Cr0.11, quenching=air, pre-cold deform=yes, aging=450 degC": {"input": [2.9, 0.64, 0.05, 0.0, 0.11, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 450.0], "time [min]": [80.0, 360.0, 5.0, 20.0, 160.0, 40.0, 10.0], "conductivity [%IACS]": [43.0, 52.43, 29.2, 33.0, 49.83, 37.87, 29.8], "hardness [HV]": [241.0, 235.88, 208.38, 227.5, 239.24, 223.44, 208.28]}, "Ni2.90, Si0.64, Mg0.05, Cr0.11, quenching=air, pre-cold deform=yes, aging=475 degC": {"input": [2.9, 0.64, 0.05, 0.0, 0.11, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 475.0], "time [min]": [80.0, 10.0, 5.0, 20.0, 160.0, 40.0, 360.0], "conductivity [%IACS]": [48.5, 29.77, 28.23, 37.43, 51.93, 44.47, 55.03], "hardness [HV]": [232.84, 212.64, 206.16, 224.5, 230.24, 232.52, 220.34]}, "Ni2.94, Si0.68, Mg0.08, Ti0.05, Cr0.12, quenching=air, pre-cold deform=yes, aging=425 degC": {"input": [2.94, 0.68, 0.08, 0.05, 0.12, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 425.0], "time [min]": [20.0, 5.0, 160.0, 360.0, 80.0, 10.0, 40.0], "conductivity [%IACS]": [26.37, 23.4, 45.2, 48.65, 42.79, 25.19, 38.29], "hardness [HV]": [216.9, 166.26, 254.22, 265.7, 242.04, 190.4, 232.52]}, "Ni2.94, Si0.68, Mg0.08, Ti0.05, Cr0.12, quenching=air, pre-cold deform=yes, aging=450 degC": {"input": [2.94, 0.68, 0.08, 0.05, 0.12, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 450.0], "time [min]": [5.0, 80.0, 10.0, 40.0, 20.0, 160.0, 360.0], "conductivity [%IACS]": [31.4, 46.81, 38.08, 44.16, 41.03, 50.4, 53.72], "hardness [HV]": [174.96, 273.28, 217.7, 258.6, 243.8, 267.72, 278.16]}, "Ni2.94, Si0.68, Mg0.08, Ti0.05, Cr0.12, quenching=air, pre-cold deform=yes, aging=475 degC": {"input": [2.94, 0.68, 0.08, 0.05, 0.12, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 475.0], "time [min]": [160.0, 5.0, 20.0, 10.0, 360.0, 40.0, 80.0], "conductivity [%IACS]": [52.8, 27.33, 42.34, 30.42, 58.93, 48.35, 50.78], "hardness [HV]": [282.12, 184.44, 258.78, 223.58, 275.86, 277.96, 276.68]}, "Ni2.94, Si0.73, quenching=water, pre-cold deform=no, aging=500 degC": {"input": [2.94, 0.73, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 500.0], "time [min]": [0.0, 300.0, 180.0, 180.0, 0.0, 300.0, 60.0, 60.0], "conductivity [%IACS]": [18.1, 39.2, 36.2, 36.2, 18.1, 39.2, 33.4, 33.4], "hardness [HV]": [70.9, 235.6, 219.3, 219.3, 70.9, 235.6, 203.1, 203.1]}, "Ni3.04, Si0.68, Mg0.07, Cr0.10, quenching=air, pre-cold deform=yes, aging=425 degC": {"input": [3.04, 0.68, 0.07, 0.0, 0.1, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 425.0], "time [min]": [10.0, 5.0, 40.0, 80.0, 160.0, 20.0, 360.0], "conductivity [%IACS]": [28.67, 26.3, 34.9, 38.97, 42.4, 29.07, 47.13], "hardness [HV]": [215.42, 198.06, 224.02, 237.38, 245.22, 212.84, 250.84]}, "Ni3.04, Si0.68, Mg0.07, Cr0.10, quenching=air, pre-cold deform=yes, aging=450 degC": {"input": [3.04, 0.68, 0.07, 0.0, 0.1, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 450.0], "time [min]": [160.0, 10.0, 80.0, 360.0, 20.0, 5.0, 40.0], "conductivity [%IACS]": [47.93, 30.67, 43.4, 51.2, 34.23, 27.67, 38.8], "hardness [HV]": [251.58, 220.34, 250.84, 239.1, 233.52, 210.06, 241.16]}, "Ni3.04, Si0.68, Mg0.07, Cr0.10, quenching=air, pre-cold deform=yes, aging=475 degC": {"input": [3.04, 0.68, 0.07, 0.0, 0.1, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 475.0], "time [min]": [10.0, 360.0, 80.0, 40.0, 160.0, 5.0, 20.0], "conductivity [%IACS]": [31.2, 51.37, 47.7, 43.63, 50.13, 28.7, 37.9], "hardness [HV]": [223.26, 227.5, 245.06, 238.76, 238.06, 196.76, 242.94]}, "Ni3.11, Si0.66, Mg0.06, Ti0.04, quenching=no SHT, pre-cold deform=no, aging=400 degC": {"input": [3.11, 0.66, 0.06, 0.04, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 400.0], "time [min]": [60.0, 10.0, 30.0, 360.0, 180.0], "conductivity [%IACS]": [33.1, 28.8, 31.3, 41.6, 38.0], "hardness [HV]": [211.85, 211.825, 217.125, 236.05, 226.325]}, "Ni3.11, Si0.66, Mg0.06, Ti0.04, quenching=no SHT, pre-cold deform=no, aging=450 degC": {"input": [3.11, 0.66, 0.06, 0.04, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 450.0], "time [min]": [180.0, 360.0, 10.0, 30.0, 60.0], "conductivity [%IACS]": [46.4, 47.2, 31.1, 37.8, 42.4], "hardness [HV]": [225.925, 226.775, 213.775, 228.74, 234.55]}, "Ni3.11, Si0.66, Mg0.06, Ti0.04, quenching=no SHT, pre-cold deform=no, aging=500 degC": {"input": [3.11, 0.66, 0.06, 0.04, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 500.0], "time [min]": [60.0, 180.0, 360.0, 30.0, 10.0], "conductivity [%IACS]": [46.5, 50.7, 51.6, 42.5, 35.5], "hardness [HV]": [214.4, 198.875, 183.0, 225.925, 223.95]}, "Ni3.13, Si0.71, Ti0.04, quenching=water, pre-cold deform=no, aging=500 degC": {"input": [3.13, 0.71, 0.0, 0.045, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 500.0], "time [min]": [0.0, 300.0, 0.0, 300.0, 180.0, 60.0, 60.0, 180.0], "conductivity [%IACS]": [18.0, 41.5, 18.0, 41.5, 38.5, 34.5, 34.5, 38.5], "hardness [HV]": [81.6, 229.2, 81.6, 229.2, 232.2, 213.2, 213.2, 232.2]}, "Ni3.20, Si0.74, Ti0.03, quenching=water, pre-cold deform=no, aging=500 degC": {"input": [3.2, 0.74, 0.0, 0.025, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 500.0], "time [min]": [60.0, 300.0, 180.0, 0.0, 0.0, 180.0, 300.0, 60.0], "conductivity [%IACS]": [37.3, 44.9, 40.2, 17.3, 17.3, 40.2, 44.9, 37.3], "hardness [HV]": [236.5, 233.2, 238.7, 68.0, 68.0, 238.7, 233.2, 236.5]}, "Ni3.26, Si0.66, Ti0.03, quenching=no SHT, pre-cold deform=no, aging=400 degC": {"input": [3.26, 0.66, 0.0, 0.03, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 400.0], "time [min]": [10.0, 30.0, 360.0, 60.0, 180.0], "conductivity [%IACS]": [32.0, 33.8, 43.2, 35.7, 39.9], "hardness [HV]": [185.55, 187.275, 205.075, 186.4, 207.45]}, "Ni3.26, Si0.66, Ti0.03, quenching=no SHT, pre-cold deform=no, aging=450 degC": {"input": [3.26, 0.66, 0.0, 0.03, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 450.0], "time [min]": [30.0, 180.0, 10.0, 60.0, 360.0], "conductivity [%IACS]": [38.8, 49.9, 33.2, 43.1, 53.4], "hardness [HV]": [204.325, 196.25, 190.225, 206.375, 199.6]}, "Ni3.26, Si0.66, Ti0.03, quenching=no SHT, pre-cold deform=no, aging=500 degC": {"input": [3.26, 0.66, 0.0, 0.03, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 500.0], "time [min]": [360.0, 60.0, 180.0, 30.0, 10.0], "conductivity [%IACS]": [55.6, 48.0, 51.0, 45.6, 36.6], "hardness [HV]": [157.05, 192.5, 175.15, 194.275, 199.475]}, "Ni3.30, Si0.79, quenching=water, pre-cold deform=no, aging=425 degC": {"input": [3.3, 0.79, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 425.0], "time [min]": [5760.0, 60.0, 1440.0, 60.0, 180.0, 5760.0, 2880.0, 5760.0, 2880.0, 2880.0, 1440.0, 1440.0, 180.0, 180.0, 60.0], "conductivity [%IACS]": [43.2, 27.4, 37.0, 27.6, 30.3, 49.9, 42.8, 55.5, 39.4, 41.7, 37.6, 37.6, 30.6, 28.4, 27.1], "hardness [HV]": [234.33, 152.10299999999995, 217.93, 156.097, 185.43, 178.3, 232.29, 158.79, 235.15, 216.87, 213.761, 229.755, 191.617, 177.697, 151.284]}, "Ni3.30, Si0.79, quenching=water, pre-cold deform=no, aging=500 degC": {"input": [3.3, 0.79, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 500.0], "time [min]": [180.0, 60.0, 180.0, 1440.0, 1440.0, 720.0, 1440.0, 60.0, 30.0, 720.0, 60.0, 30.0, 720.0, 30.0, 180.0], "conductivity [%IACS]": [40.3, 36.6, 40.1, 48.5, 50.4, 46.8, 46.2, 36.8, 33.9, 45.7, 36.6, 34.2, 44.2, 34.0, 40.6], "hardness [HV]": [236.298, 233.154, 230.376, 208.341, 157.113, 187.85, 201.038, 216.958, 207.318, 227.305, 229.695, 204.753, 217.064, 216.115, 227.407]}, "Ni3.30, Si0.79, quenching=water, pre-cold deform=no, aging=575 degC": {"input": [3.3, 0.79, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 575.0], "time [min]": [30.0, 30.0, 60.0, 1440.0, 30.0, 60.0, 1440.0, 1440.0, 5.0, 10.0, 5.0, 5.0, 10.0, 10.0, 60.0], "conductivity [%IACS]": [36.1, 37.6, 37.8, 44.6, 36.9, 39.4, 45.7, 45.0, 28.1, 34.3, 29.9, 28.6, 33.5, 35.0, 38.5], "hardness [HV]": [205.183, 240.74, 211.845, 131.95, 239.606, 218.35, 138.886, 135.464, 188.497, 255.852, 186.649, 192.011, 235.328, 249.039, 211.299]}, "Ni3.99, Si0.88, quenching=water, pre-cold deform=no, aging=500 degC": {"input": [3.99, 0.88, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 500.0], "time [min]": [0.0, 180.0, 300.0, 60.0, 60.0, 0.0, 180.0, 300.0], "conductivity [%IACS]": [15.5, 36.8, 40.1, 32.0, 32.0, 15.5, 36.8, 40.1], "hardness [HV]": [82.3, 255.0, 246.9, 241.6, 241.6, 82.3, 255.0, 246.9]}, "Ni4.02, Si0.93, Ti0.02, quenching=water, pre-cold deform=no, aging=500 degC": {"input": [4.02, 0.93, 0.0, 0.023, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 500.0], "time [min]": [0.0, 300.0, 300.0, 180.0, 180.0, 60.0, 60.0, 0.0], "conductivity [%IACS]": [15.4, 46.9, 46.9, 42.1, 42.1, 33.1, 33.1, 15.4], "hardness [HV]": [77.7, 222.1, 222.1, 240.6, 240.6, 239.9, 239.9, 77.7]}, "Ni4.05, Si0.92, Ti0.04, quenching=water, pre-cold deform=no, aging=500 degC": {"input": [4.05, 0.92, 0.0, 0.041, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 500.0], "time [min]": [60.0, 300.0, 60.0, 180.0, 0.0, 0.0, 300.0, 180.0], "conductivity [%IACS]": [32.7, 50.3, 32.7, 46.9, 15.7, 15.7, 50.3, 46.9], "hardness [HV]": [243.3, 195.4, 243.3, 229.7, 81.6, 81.6, 195.4, 229.7]}};