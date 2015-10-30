jQuery(function ($) {
    $(document)
            .on('click', '.data_table__btns__btn--plus', function() {
                addDropData($(this).attr('data-stage-id'), $(this).attr('data-item-id'));
                renderSummaryChart();
            })
            .on('click', '.data_table__btns__btn--minus', function() {
                removeDropData($(this).attr('data-stage-id'), $(this).attr('data-item-id'));
                renderSummaryChart();
            })
    ;
    $(document).on('ready', function() {
        main();
    });
    $(document).on('shown.bs.tab', 'a[data-toggle="tab"]', function (e) {
      var activatedTab = e.target // activated tab
      var activatedTabAreaId = activatedTab.hash.replace(/^#/,'');
      var activatedTabId = ['#tab_', activatedTabAreaId].join('');
      addTabHistory(activatedTab.hash.replace(/^#/,''));
      $('.header__summary_tabs__tab').removeClass('active');
      $(activatedTabId).addClass('active').prependTo('.header__summary_tabs');
      renderSummaryChart();
      // 処理,,,,,
    });
});

    var areaMaster = [];
    var houguMaster = [];
    var hiyakuMaster = [];

    const HOUGU_ID_PREFIX = 'ho';
    const HIYAKU_ID_PREFIX = 'hi';
    const COMMON_ID_PREFIX = 'co';

    const CACHE_KEY_DROP_SUMMARY = "drop_summary";
    const CACHE_KEY_TAB_HISTORY  = "tab_history";

    /**
     * GoogleSpreadSheetのデータを取得するラッパ関数
     *
     * @param {String} sheetName シート名
     * @param {String} query spreadSheet検索クエリ
     * @param {Function} callback Callback関数
     *
     */
    function getSpreadSheetData(sheetName, query, callback)
    {
        var queryString = encodeURIComponent(query);
        var query = new google.visualization.Query(
            'https://docs.google.com/spreadsheets/d/1smgr3ac_mdauXSSVc27RaHVFlzQkI40fZSWXzxLiu30/gviz/tq?headers=1&sheet=' + sheetName + '&tq=' + queryString);

        var callbackWrapper = getSpreadSheetDataCallbackWrapper(sheetName, callback);

        query.send(callbackWrapper);
    }

    /**
     * エラーハンドリングとdeferredを制御するラッパー関数を返す
     *
     * @param {String} sheetName シート名
     * @param {Function} callback コールバック関数
     * 
     * @return {Function}
     *
     */
    function getSpreadSheetDataCallbackWrapper(sheetName, callback)
    {
        var callbackWrapper = function(response)
        {
            var deferred = deferreds[sheetName] === undefined ? new $.Deferred() : deferreds[sheetName];
            if (response.isError())
            {
                alert('Error in query: ' + response.getMessage() + ' ' + response.getDetailedMessage());
                deferred.reject();
            } else 
            {
                callback(response);
                deferred.resolve();
            }
            return deferred.promise();
        };
        return callbackWrapper;
    }

    /**
     * deferred一覧
     */
    var deferreds   = 
    {
        stageMaster : undefined,
        dropList    : undefined
    };

    /**
     * SpreadSheetの実データ
     */
    var spreadSheetData = {
        stageMaster : {},
        dropList : {}
    };

    var stageData = {};
  
    /**
     * stageMasterシートの情報を取得して変数`stageMaster`に格納する
     */
    function getStageMaster()
    {
        getSpreadSheetData('stageMaster', 'SELECT A, B, C, D WHERE A is not null and A != ""', parseStageMaster);
    }
  
    /**
     * dropListシートの情報を取得して変数`dropList`に格納する
     */
    function getDropList()
    {
        getSpreadSheetData('dropList', 'SELECT A, B, C, D WHERE A is not null and A != ""', parseDropList);
    }

    /**
     * SpreadSheetのDataTableを{columnLavel:cellValue,...}の配列に変換する
     * @param {Object} dataTable response.getDataTable()
     *
     * @return {Array} [{columnLavel:cellValue,...},...]
     */
    function convertDataTableToArray(dataTable)
    {
        var dataTableArray = [];
        for (var rowIndex = 0; rowIndex < dataTable.getNumberOfRows(); rowIndex++ ) {
            var row = {};
            for (var colIndex = 0; colIndex < dataTable.getNumberOfColumns(); colIndex++) {
                row[dataTable.getColumnLabel(colIndex)] = dataTable.getFormattedValue(rowIndex, colIndex);
            }
            dataTableArray.push(row);
        }
        return dataTableArray;
    }

    function parseStageMaster(response)
    {
        var data = response.getDataTable();
        console.dir(data);
        console.log("resolve stageMaster");
        spreadSheetData.stageMaster = convertDataTableToArray(data);
        spreadSheetData.stageMaster.forEach(function(stage)
        {
            stageData[stage.stageId] = stage;
        });
    }
  
    function parseDropList(response)
    {
        deferreds.stageMaster.done(function()
        {
            console.log("after stageMaster");
            var data = response.getDataTable();
            console.dir(data);
            spreadSheetData.dropList = convertDataTableToArray(data);
            spreadSheetData.dropList.forEach(function(item)
            {
                var stage = stageData[item.stageId]
                if (stage !== undefined) {
                    if (stage['items'] === undefined) {
                        stage['items'] = [];
                    }
                    stage.items.push(item);
                }
            });
        });
    }

    function init()
    {
        // Deferredリストを初期化
        Object.keys(deferreds).forEach(function(key){
            deferreds[key] = new $.Deferred();
        });
    }

    function main() 
    {
        init();
        getStageMaster();
        getDropList();
        deferreds.dropList.done(function()
                {
                    console.log("start render");
                    renderSummaryHeaderTab();
                    renderSummaryDataFrame();
                    renderDropSummary();
                });
    }

    function renderSummaryHeaderTab() 
    {
        var stageList = [];
        Object.keys(stageData).forEach(function(key)
                {
                    stageList.push(stageData[key]);
                });
        $('.header__summary_tabs').html(templates["summary_header_tab"].render({stageList:stageList}));
    }

    function renderSummaryDataFrame()
    {
        var stageList = [];
        Object.keys(stageData).forEach(function(key)
                {
                    stageList.push(stageData[key]);
                });
        $('.main__content').html(templates["summary_data_frame"].render({stageList:stageList}));
    }

    /*
     * Cacheデータを元に集計結果をレンダリングする
     * */

    function renderDropSummary() {
        var cacheData = getCacheData(CACHE_KEY_DROP_SUMMARY);
        Object.keys(cacheData).forEach(function(stageId) {
            var cache = cacheData[stageId];
            var dropSummary = {};
            var dropCount = 0;
            // dropListを集計する
            for (var dropListIndex = 0; dropListIndex < cache.dropList.length; dropListIndex++) {
                var dropItem = cache.dropList[dropListIndex];
                if (dropSummary[dropItem] === undefined) {
                    dropSummary[dropItem] = 0;
                }
                dropSummary[dropItem]++;
                dropCount++;
            }
            // 集計結果を元に確率を算出
            Object.keys(dropSummary).forEach(function(itemId) {
                var count = dropSummary[itemId];
                var persent = ((count / dropCount) * 100).toFixed(4);
                $(['#', stageId, ' .data_table__row[data-item-id="', itemId, '"] .data_table__row__persent'].join('')).html(persent+'%');
                $(['#', stageId, ' .data_table__row[data-item-id="', itemId, '"] .data_table__count'].join('')).val(count);
            });
            console.dir(dropSummary);
        });
    }

    function callbackTest(a,b,c,d,e) {
        console.dir(a,b,c,d,e);
    }

    function renderSummaryChart()
    {
        var dropSummaryList = [];
        var typeSummaryList = [];
        var typeSummary = {};
        $('.content__summary_data:visible .summary_data__content__data_table tr.data_table__row').each(function()
        {
          var itemName = $(this).attr('data-item-name');
          var itemId = $(this).attr('data-item-id');
          var itemType = itemId.match(/^(\w+)_/)[1];
          var count = Number($('.data_table__count', this).val());
          dropSummaryList.push([itemId, count]);
          typeSummary[itemType] = typeSummary[itemType] === undefined ? 0 : typeSummary[itemType];
          typeSummary[itemType] += Number(count);
        });
        typeSummaryList = Object.keys(typeSummary).map(function(key)
        {
          return [key, typeSummary[key]];
        });
        renderDonutChart(dropSummaryList, typeSummaryList);        
    }

    /*
     * グラフ描画
     * */
    function renderDonutChart(s1, s2) {
        // var plot3 = $.jqplot('chart', [outerGraphData, innerGraphData], {
        var plot3 = $.jqplot('chart', [s1, s2], {
            seriesDefaults: {
              // make this a donut chart.
              renderer:$.jqplot.DonutRenderer,
              rendererOptions:{
                // Donut's can be cut into slices like pies.
                sliceMargin: 3,
                // Pies and donuts can start at any arbitrary angle.
                startAngle: -90,
                showDataLabels: true,
                // By default, data labels show the percentage of the donut/pie.
                // You can show the data 'value' or data 'label' instead.
                dataLabels: 'value'
              }
            },
            legend: { show:true, location: 'e' }
        });
    }

    /*
     * ステージ毎の集計結果を表示する
     * */
    function showStageSummary(areaId, stageId) {
        var stage = getStageMasterData(areaId, stageId);
        console.dir(stage);
        if (stage === false) {
            return false;
        }
        
    }

    /*
     * Drop情報のObject
     * */
    DropCacheData = function(stageId) {
        this.stageId = stageId;
        this.dropList = [];
    }

    /*
     * Drop情報追加
     * */
　　function addDropData(stageId, itemId) {
        var cacheData = getStageCacheData(stageId);
        if (cacheData === false) {
            cacheData = new DropCacheData(stageId);
        }
        cacheData.dropList.push(itemId);
        setStageCacheData(stageId, cacheData);
        $(['#'+stageId+' .data_table__row--'+itemId+' .data_table__count'].join(''));
        renderDropSummary();
    }

    /*
     * Drop情報削除
     * */
　　function removeDropData(stageId, itemId) {
        var cacheData = getStageCacheData(stageId);
        if (cacheData === false) {
            return false;
        }
        // 直近のItemIDがマッチするデータを削除
        for (var dropListIndex = cacheData.dropList.length - 1; dropListIndex >= 0; dropListIndex--) {
            var drop = cacheData.dropList[dropListIndex];
            if (drop === itemId) {
                cacheData.dropList.splice(dropListIndex, 1);
                setStageCacheData(stageId, cacheData);
                renderDropSummary();
                return true;
            }
        }
        return false;
    }

    function getStageCacheData(stageId) {
        var cacheData = getCacheData(CACHE_KEY_DROP_SUMMARY);
        if (cacheData[stageId] === undefined) {
            return false;
        } else{
            return cacheData[stageId];
        }
    }

    function setStageCacheData(stageId, dropData) {
        var cacheData = getCacheData(CACHE_KEY_DROP_SUMMARY);
        cacheData[stageId] = dropData;
        setCacheData(CACHE_KEY_DROP_SUMMARY, cacheData);
    }

    function addTabHistory(tabId) {
        var tabHistory = getCacheData(CACHE_KEY_TAB_HISTORY);
        if(tabHistory.length === undefined || tabHistory.length === 0) {
            tabHistory = [];
        }
        // 引数「tabId」を除外した新しいtabHistoryを生成する。
        var newTabHistory = [];
        for (var tabHistoryIndex = 0; tabHistoryIndex < tabHistory.length; tabHistoryIndex++) {
            var tabHistoryRow = tabHistory[tabHistoryIndex]; 
            if (tabHistoryRow !== tabId) {
                newTabHistory.unshift(tabHistoryRow);
            }
        }
        newTabHistory.unshift(tabId);
        setCacheData(CACHE_KEY_TAB_HISTORY, newTabHistory);
    }

    /*
     * キャッシュデータ取得
     * */
    function getCacheData(key) {
        var cache = {};
        var cacheStr = getLocalStorageData(key);
        if (cacheStr !== undefined) {
            cache = JSON.parse(cacheStr);
        }
        return cache;
    }

    /*
     * キャッシュデータ保存
     * */
    function setCacheData(key, value) {
        var jsonValue = JSON.stringify(value);
        setLocalStorageData(key, jsonValue);
    }

    /*
     * LocalStorageからデータを取得
     * */
    function getLocalStorageData(key) {
        return localStorage[key];
    }

    /*
     * LocalStorageにデータを保存
     * */
    function setLocalStorageData(key, value) {
        localStorage[key] = value;
    }

