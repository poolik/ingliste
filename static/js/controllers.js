app.controller('TemperatureCtrl', ['$scope', '$http', 'TempChart',
  function ($scope, $http, TempChart) {
    var defaultChart = {id: "24h", name: "24h"};
    $scope.chartTypes = [{id:"3h", name:"3h"}, defaultChart, {id:"48h", name:"48h"}, {id:"1w", name:"Nädal"}, {id:"1m", name:"Kuu"}, {id:"3m", name:"3 Kuud"}, {id:"1y", name:"Aasta"}];
    $scope.activeChartId = "";
    $scope.errorMsg = "";

    $scope.showChart = function(type) {
      $scope.activeChartId = type.id;
      $scope.errorMsg = "";
      TempChart.loadChart(type.id).catch(function(error) {
        if (error.status == 404) $scope.errorMsg = "Viga! Andmed puuduvad!";
        else $scope.errorMsg = "Viga! " + error.responseText;
      });
    };

    $scope.showChart(defaultChart);
  }]);

app.controller('RemoteCtrl', ['$scope', '$http', 'observeOnScope',
  function ($scope, $http, observeOnScope) {
    $scope.isave = false;
    $scope.mode = "";
    $scope.temperature = 21;
    $scope.alerts = [];
    var requestPending = false;
    var initDone = false;
    getRemoteState();

    observeOnScope($scope, 'isave').skip(2).subscribe(function () {
      sendState();
    });

    observeOnScope($scope, 'mode').skip(2).subscribe(function () {
      sendState();
    });

    $scope.$createObservableFunction('increase')
        .map(function () { return $scope.temperature; })
        .filter(function(temp) { return temp < 30; })
        .map(function() { return ++$scope.temperature; })
        .debounce(500)
        .subscribe(function() {
          sendState();
        });

    $scope.$createObservableFunction('decrease')
        .map(function () { return $scope.temperature; })
        .filter(function(temp) { return temp > 16; })
        .map(function() { return --$scope.temperature; })
        .debounce(500)
        .subscribe(function() {
          sendState();
        });

    $scope.closeAlert = function(index) {
      $scope.alerts.splice(index, 1);
    };

    function addInfoAlert(msg) {
      $scope.alerts.push({type:'success', msg: msg});
    }

    function addErrorAlert(msg) {
      $scope.alerts.push({type:'danger', msg: msg});
    }

    function addWarningAlert(msg) {
      $scope.alerts.push({type:'warning', msg: msg});
    }

    function finishRequest(data) {
      requestPending = false;
      console.log(data);
      document.body.style.opacity = "1";
    }

    function startRequest() {
      if (requestPending) {
        addWarningAlert("Wait for previous request to finish!");
        return false;
      }
      requestPending = true;
      return requestPending
    }

    function sendState() {
      if (!startRequest()) return;
      requestPending = true;
      document.body.style.opacity = "0.5";
      $http.post("/remote", {temperature: $scope.temperature, mode:$scope.mode, isave:$scope.isave}).then(function(data) {
        finishRequest(data);
        addInfoAlert(data.data);
      }, errorHandler);
    }

    function getRemoteState() {
      if (!startRequest()) return;
      $http.get("/remote").then(function (data) {
        finishRequest(data);
        $scope.temperature = data.data.temperature;
        $scope.isave = data.data.isave;
        $scope.mode = data.data.mode;
        initDone = true;
      }, errorHandler)
    }

    function errorHandler(data) {
      finishRequest(data);
      addErrorAlert(data.data);
    }
  }]);