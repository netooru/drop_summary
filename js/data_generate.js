jQuery(function ($) {

        const ITEM_RANKS = ["壱", "弐", "参", "極", "神", "神極"];
        
        function supplement(value, supplementValue) {
            if (value === undefined) {
                return supplementValue;
            }
            return value;
        }

        Stage = function(areaId, stageId) {
                this.areaId = areaId;
                this.stageId = stageId;
                this.dropItems = [];
        };

        Stage.prototype.addDropItem = function(itemId, num) {
                num = supplement(num, 1);
                this.dropItems.push({itemId:itemId, num:num});
        };

        var areaIndex = 1;
        Area = function(id, name, maxStage, areaType, hasEx, maxExStage) {
                this.id = id;
                this.name = name;
                this.maxStage = supplement(maxStage, 5);
                this.areaType = supplement(areaType, "N");
                this.hasEx = supplement(hasEx, false);
                this.stageList = [];
                if (this.areaType === "N") {
                        stagePrefix = String(areaIndex);
                        areaIndex++;
                } else {
                        stagePrefix = this.areaType;
                }
                for (var stageIndex = 0; stageIndex < this.maxStage; stageIndex++) {
                    this.stageList.push(new Stage(id, stagePrefix + "-" + (stageIndex + 1)));
                }
                if (this.hasEx === true) {
                    maxExStage = supplement(maxExStage, 0);
                    for (var exStageIndex = 0; exStageIndex < maxExStage; exStageIndex++) {
                        this.stageList.push(new Stage(id, "EX-" + (exStageIndex + 1)));
                    }
                }    
        };
        Area.prototype.addDropItem = function(stageId, itemId, num) {
                for (var stageIndex = 0; stageIndex < this.stageList.length; stageIndex++) {
                        var stage = this.stageList[stageIndex];
                        if (stage.stageId === stageId) {
                                stage.addDropItem(itemId, num);
                        }
                }
        };

        ItemData = function(itemTypeId, name, rank, highRank, highRankName) {
                this.itemTypeId = itemTypeId;
                if (rank === undefined) {
                    this.rank = 0;
                    this.name = name;
                } else {
                    this.rank = rank;
                    var rankName = ITEM_RANKS[rank];
                    highRank = supplement(highRank, 99999);
                    highRankName = supplement(highRankName, name);
                    if (rank >= highRank) {
                        this.name = highRankName;
                        // 神・神極の場合に「神」の文字を取り除く力技
                        rankName = rankName.substr(1);
                        if (rankName.length > 0) {
                                this.name = name + "・" + rankName;
                        }
                    } else {
                        this.name = name + "・" + rankName;
                    }
                }
        };
        function createItemData(itemTypeId, name, maxRank, highRank, highRankName) {
            var itemData = {
                itemTypeId : itemTypeId,
                name : name,
                isMultiRank : false,
                ranks : []
            };
            if (maxRank !== undefined) {
                itemData.isMultiRank = true;
                for (var rankIndex = 0; rankIndex <= maxRank; rankIndex++) {
                    itemData.ranks.push(new ItemData(itemTypeId, name, rankIndex, highRank, highRankName));
                }
            }
            return itemData;
        }

        function generateAreaList() {
            var areaList = [];
            var amazon = new Area('amazon', "神秘の密林", 5, "E", true, 1);
            amazon.addDropItem('EX-1', 'ho_ch-4');
            amazon.addDropItem('EX-1', 'ho_ch-5');
            amazon.addDropItem('EX-1', 'ho_yu-4');
            amazon.addDropItem('EX-1', 'ho_yu-5');
            amazon.addDropItem('EX-1', 'ho_sa-4');
            amazon.addDropItem('EX-1', 'ho_sa-5');
            amazon.addDropItem('EX-1', 'co_co', 10);
            amazon.addDropItem('EX-1', 'co_co', 20);
            areaList.push(amazon);
            return areaList;
        }

        function generateHouguList() {
            var houguList = [];
            var houguData = [
                    [0,"ho_ko","紅玉","紅蓮"],[0,"ho_so","蒼玉","加護"],[0,"ho_ou","黄玉","正鵠"],[0,"ho_su","翠玉","空蝉"],[0,"ho_ai","藍玉","創成"],[0,"ho_sl","銀","白銀"],[0,"ho_gy","白牛","牛魔王"],[0,"ho_on","鬼","夜叉"],[1,"ho_sy","酒呑"],[1,"ho_gi","技能"],[2,"ho_ki","金"],[1,"ho_gn","紅蓮日輪"],[2,"ho_ni","虹蠍"],[0,"ho_hi","日長石","日輪"],[0,"ho_ka","加撃","強撃"],[0,"ho_se","穿孔","牙突"],[0,"ho_gk","逆境","逆襲"],[0,"ho_ha","反射","乱反射"],[0,"ho_ht","破鉄","壊鉄"],[0,"ho_hs","破砕","粉砕"],[0,"ho_ry","流麗","流動"],[0,"ho_kg","金剛","剛体"],[3,"ho_lv","銅","純銀","黄金","プラチナ", "ダイヤ"],[0,"ho_sf","修復","改修"],[0,"ho_ch","忠誠","精巧"],[0,"ho_yu","勇士","英雄"],[0,"ho_sa","再生","復元"],[0,"ho_kr","古龍封じ","古龍殺し"]
            ];

            for (var houguIndex = 0; houguIndex < houguData.length; houguIndex++) {
                var hougu = houguData[houguIndex];
                var dataType = hougu[0];
                if (dataType === 0) {
                    houguList.push(createItemData(hougu[1], hougu[2], 5, 4, hougu[3]));
                } else if (dataType === 1) {
                    houguList.push(new ItemData(hougu[1], hougu[2], 4, 4, hougu[2]));
                    houguList.push(new ItemData(hougu[1], hougu[2], 5, 4, hougu[2]));
                } else if (dataType === 2) {
                    houguList.push(new ItemData(hougu[1], hougu[2]));
                } else if (dataType === 3) {
                    for (var houguRankIndex = 2; houguRankIndex < hougu.length; houguRankIndex++) {
                        houguList.push(new ItemData(hougu[1], hougu[houguRankIndex]));
                    }
                }
            }
            return houguList;
        }

        function generateHiyakuList() {
            var hiyakuList = [];
            var hiyakuData = [
                ["hi_ko","攻勢の秘薬"], ["hi_bo","防備の秘薬"], ["hi_sy","集中の秘薬"], ["hi_ka","回避の秘薬"], ["hi_ky","教範の秘薬"], ["hi_se","先陣の秘薬"], ["hi_gi","技能の秘薬"], ["hi_ke","建築の秘薬"], ["hi_ho","宝珠探知の秘薬"]
            ];

            for (var hiyakuIndex = 0; hiyakuIndex < hiyakuData.length; hiyakuIndex++) {
                var hiyaku = hiyakuData[hiyakuIndex];
                hiyakuList.push(createItemData(hiyaku[0], hiyaku[1], 4));
            }
            return hiyakuList;
        }

        function generateCommonItemList() {
                var itemList = [];
                var itemData = [
                    ["co_co","コーヒー"], ["co_ae","エーテル"], ["co_ke","建材"]
                ];
                for (var itemIndex = 0; itemIndex < itemData.length; itemIndex++) {
                    var item = itemData[itemIndex];
                    itemList.push(createItemData(item[0], item[1]));
                }
                return itemList;
        }

        $(document).on('ready',function(){
            var areaList = generateAreaList();
            var houguList = generateHouguList();
            var hiyakuList = generateHiyakuList();
            var commonItemList = generateCommonItemList();

            // TODO:アイテムをジャンル毎に分ける必要ある？
            var masterData = {
                'area'  : areaList,
                'hougu' : houguList,
                'hiyaku' : hiyakuList,
                'common' : commonItemList
            };

            $('#areaListJson').html(JSON.stringify(areaList));
            $('#houguListJson').html(JSON.stringify(houguList));
            $('#hiyakuListJson').html(JSON.stringify(hiyakuList));
            $('#itemListJson').html(JSON.stringify(commonItemList));

            $('#masterDataJson').html(JSON.stringify(masterData));
        
        });



});
