jQuery(function ($) {
    $(document).on('click', '.add-list-button', function() {
            var item_data = {
                    index:getContentListRows().size(),
                    item:$(this).attr('data-item-name')
            };
            addItemList([item_data]);
            saveItemList();
    });
    $(document)
            .on('click', '.data_table__btns__btn--plus', function() {
                addDropData($(this).attr('data-stage-id'), $(this).attr('data-item-id'));
                renderDonutChart();
            })
            .on('click', '.data_table__btns__btn--minus', function() {
                removeDropData($(this).attr('data-stage-id'), $(this).attr('data-item-id'));
                renderDonutChart();
            })
    ;
    $(document).on('ready', function() {
        loadSummaryMaster().done(function() {
            renderFrame();
            renderDropSummary();
            renderDonutChart();
        });
    });
    $(document).on('shown.bs.tab', 'a[data-toggle="tab"]', function (e) {
      var activatedTab = e.target // activated tab
      var activatedTabAreaId = activatedTab.hash.replace(/^#/,'');
      var activatedTabId = ['#tab_', activatedTabAreaId].join('');
      addTabHistory(activatedTab.hash.replace(/^#/,''));
      $('.header__summary_tabs__tab').removeClass('active');
      $(activatedTabId).addClass('active').prependTo('.header__summary_tabs');
      renderDonutChart();
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

    /*
     * MasterDataを取得する
     * */
    function loadSummaryMaster() {
        var xhr = $.ajax({
            type: 'GET',
            url: '/data/summary_master.json',
            dataType: 'json',
            success: function(json){
                areaMaster = json.area;
                houguMaster = json.hougu;
                hiyakuMaster = json.hiyaku;
                commonMaster = json.common;

                parseAreaMaster();
            },
            complete : function(){
              console.log('complete');
            }
        });
        return xhr;
    }

    /*
     * AreaMasterを解析
     *
     * */
    function parseAreaMaster() {
        for (var areaMasterIndex = 0; areaMasterIndex < areaMaster.length; areaMasterIndex++) {
            var area = areaMaster[areaMasterIndex];
            parseAreaData(area);
        }
    }

    /*
     * Areaデータを解析
     *
     * */
    function parseAreaData(area) {
        for (var stageListIndex = 0; stageListIndex < area.stageList.length; stageListIndex++) {
            var stage = area.stageList[stageListIndex];
            parseStageData(stage);
        }
    }

    /*
     * stageデータを解析
     * */
    function parseStageData(stage) {
        for (var dropItemIndex = 0; dropItemIndex < stage.dropItems.length; dropItemIndex++) {
            var dropItem = stage.dropItems[dropItemIndex];
            parseDropItemData(dropItem);
        }
    }

    /*
     * dropItemのデータを解析
     * IDを元にitemMasterからデータを引っ張ってくる。
     * */
    function parseDropItemData(dropItem) {
        var itemData = getItemMasterData(dropItem.itemId);
        if (itemData !== false) {
            $.extend(dropItem, itemData);
            if (dropItem.num > 1) {
                dropItem.name += '×' + dropItem.num;
            }
        }
    }

    /*
     * AreaIDを元にAreaDataを取得する
     * */
    function getAreaMasterData(areaId) {
        for (var areaIndex = 0; areaIndex < areaMaster.length; areaIndex++) {
            var area = areaMaster[areaIndex];
            if (area.id === areaId) {
                return area;
            }
        }
        return false;
    }

    /*
     * AreaIDとStageIDを元にStageDataを取得する
     * */
    function getStageMasterData(areaId, stageId) {
        var area = getAreaMasterData(areaId);
        if (area !== false) {
            var stageMaster = area.stageList;
            for (var stageIndex = 0; stageIndex < stageMaster.length; stageIndex++) {
                var stage = stageMaster[stageIndex];
                if (stage.stageId === stageId) {
                    return stage;
                }
            }
        }
        return false;
    }

    /*
     * ItemIDを元にItemDataを取得する
     * */
    function getItemMasterData(itemId) {
        var itemIdMatch = itemId.match(/^((\w+)_\w+)(?:-(\d+))?/);
        if (itemIdMatch === null) {
            return false;
        }
        var itemTypeId = itemIdMatch[1];
        var itemIdPrefix = itemIdMatch[2];
        var itemRank = itemIdMatch[3];
        var itemMaster = [];
        if (itemIdPrefix === HOUGU_ID_PREFIX) {
            itemMaster = houguMaster;
        } else if (itemIdPrefix === HIYAKU_ID_PREFIX) {
            itemMaster = hiyakuMaster;
        } else if (itemIdPrefix === COMMON_ID_PREFIX) {
            itemMaster = commonMaster;
        }
        for (var itemMasterIndex = 0; itemMasterIndex < itemMaster.length; itemMasterIndex++) {
            var item = itemMaster[itemMasterIndex];
            if (item.itemTypeId === itemTypeId) {
                if (itemRank === undefined) {
                    return item;
                } else {
                    for (var itemRankIndex = 0; itemRankIndex < item.ranks.length; itemRankIndex++) {
                        var rank = item.ranks[itemRankIndex];
                        if (rank.rank === Number(itemRank)) {
                            return rank;
                        }
                    }
                }
                break;
            }
        }
        return false;
    }

    /*
     * MasterDataを元にHTMLをレンダリングする
     * */
    function renderFrame() {
        $('.header__summary_tabs').append(templates['summary_header_tab'].render({area:areaMaster}));
        $('.main__content').append(templates['summary_data_frame'].render({area:areaMaster}));
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
                $(['#', stageId, ' .data_table__row--', itemId, ' .data_table__row__persent'].join('')).html(persent+'%');
            });
            console.dir(dropSummary);
        });
    }

    /*
     * グラフ描画
     * */
    function renderDonutChart() {
        var dropList = getStageCacheData($('.content__summary_data:visible').attr("id")).dropList;
        var typeSummary = {};
        for (var dropListIndex = 0; dropListIndex < dropList.length; dropListIndex++) {
            var dropItem = dropList[dropListIndex];
            var typeMatch = dropItem.match(/^(\w+?)_/);
            if (typeMatch !== undefined) {
                var type = typeMatch[1];
                if (typeSummary[type] === undefined) {
                    typeSummary[type] = {count:0, items:{}};
                }
                typeSummary[type].count++;
                if(typeSummary[type].items[dropItem] === undefined){
                    typeSummary[type].items[dropItem] = 0;
                }
                typeSummary[type].items[dropItem]++;
            }
        }
        console.dir(typeSummary);
        var outerGraphData = [];
        var innerGraphData = [];
        Object.keys(typeSummary).forEach(function(type) {
            outerGraphData.push([type, typeSummary[type].count]);
            Object.keys(typeSummary[type].items).forEach(function(itemId) {
                innerGraphData.push([getItemMasterData(itemId).name, typeSummary[type].items[itemId]]);
            });
        });
        console.dir(outerGraphData);
        console.dir(innerGraphData);
        var s1 = [['a',6], ['b',8], ['c',14], ['d',20]];
        var s2 = [['a', 8], ['b', 12], ['c', 6], ['d', 9]];
         
        var plot3 = $.jqplot('chart', [outerGraphData, innerGraphData], {
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



    loadSummaryMaster();


