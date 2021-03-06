import * as PIXI from 'pixi.js';

import Shape from './Shape';
import Bitmap from './Bitmap';
import MovieClip from './MovieClip';
import TextField from './TextField';
import ResourcesLoader from './ResourcesLoader';

/*export {Shape, Bitmap, MovieClip, TextField}*/

export default new class FlashLib {

    constructor() {
        PIXI.Loader.registerPlugin(ResourcesLoader);

        this.Shape = Shape;
        this.Bitmap = Bitmap;
        this.MovieClip = MovieClip;
        this.TextField = TextField;
        this.documents = {};

        this.registeredClassesObject = {};

        this.libraries = [];
    }

    /**
     * Добавить класс для создания во время постоения элементов
     * @param {string} $path путь по которому можно взять класс (через точку)
     * @param {string} $class объкет класса для создания
     */
    registerClass($path, $class) {
        let splittedName = $path.split('.');
        let obj = this.registeredClassesObject;
        splittedName.forEach((name, index, arr) => {
            if (index === arr.length - 1) {
                obj[name] = $class;
            } else {
                obj[name] = {};
                obj = obj[name];
            }
        });
    }

    /**
     * Добавить новую библиотеку
     * @param {*} $library
     */
    addNewLibrary($library) {
        this.documents[$library.metaData.name] = $library;
        //this.libraries.push($library);
    }

    /**
     * Создать элемент из библиотеки по имени
     * @param {object|string} $displayItemData имя элемента
     * @param {string} $libraryName имя библиотеки
     * @returns {*}
     */
    createItemFromLibrary($displayItemData, $libraryName) {
        if (typeof $displayItemData === 'string') {
            $displayItemData = {
                libraryItem: $displayItemData
            };
        }

        let itemData = this.getItemDataFromLibrary($displayItemData.libraryItem, $libraryName);
        if (!itemData) {
            throw new Error('В библиотеке не найден элемент ' + $displayItemData.libraryItem);
        }
        itemData.libraryName = $libraryName;
        //itemData.displayData = $displayItemData;
        let libraryItem = this.createItemFromLibraryData(itemData, $displayItemData);
        return libraryItem;
    }

    /**
     * Получить данные для объекта из библиотеки
     * @param {string} $itemName имя элемента
     * @param {string} $libraryName имя библиотеки
     */
    getItemDataFromLibrary($itemName, $libraryName) {
        let splittedName = $itemName.split('\/');
        let lib = this.getLibraryByName($libraryName).lib;
        let itemData = this._getItemDataFromName(lib, splittedName);
        return itemData;
    }

    _getItemDataFromName($parent, $splittedName) {
        let currName = $splittedName.shift();
        if(currName !== '.') {
            $parent = $parent[currName];
        }
        if ($splittedName.length > 0) {
            $parent = this._getItemDataFromName($parent, $splittedName);
        }
        return $parent;
    }

    /**
     * Получить все элементы из бибилиотеки по типу
     * @param {string} $itemType тип элемента
     * @param {string} $libraryName имя библиотеки
     * @returns {[]}
     */
    findItemByType($itemType, $libraryName) {
        let lib = this.getLibraryByName($libraryName).lib;
        return this._checkFolder('.', $itemType, lib)
    }

    _checkFolder($folderName, $itemType, $lib) {
        let result = [];
        let folder = this._getItemDataFromName($lib, $folderName.split('\/'))
        for (let itemName in folder) {
            let item = folder[itemName];
            if(item && item.hasOwnProperty('itemType')) {
                switch (item.itemType) {
                    case 'folder':
                        result = result.concat(this._checkFolder(item.name, $itemType, $lib));
                        break;
                    case $itemType:
                        result.push(item);
                        break;
                }
            }
        }
        return result;
    }

    /**
     * Получение библиотеки по имени
     * @param {string} $libraryName имя библиотеки
     * @returns {*}
     */
    getLibraryByName($libraryName) {
        /*let index = this.libraries.findIndex(function (library) {
            return library.metaData.name === $libraryName
        });
        if (index === -1) {
            index = 0
        }
        return this.libraries[index]*/
        return this.documents[$libraryName];
    }

    /**
     * Получить элемент из библиотеки
     * @param {*} $libraryItemData данные элемента библиотеки
     */
    createItemFromLibraryData($libraryItemData, $displayItemData) {
        let item = null;
        let type = $libraryItemData.linkageExportForAS ?
            $libraryItemData.linkageClassName :
            $libraryItemData.itemType;

        switch (type) {
            case 'movie clip':
                item = new this.MovieClip($libraryItemData, $displayItemData);
                break;
            case 'bitmap':
                item = new this.Bitmap($libraryItemData, $displayItemData);
                break;
            default:
                let classObject = getClassByName.call(this, type);
                /*if ($libraryItemData.symbolType === 'movie clip') {
                    if (classObject) {
                        item = new classObject($libraryItemData, $displayItemData);
                    } else {
                        throw new Error('Не найден класс. ' + type + ' Для регистрации класса испольщуйте FlashLib.registerClass');
                    }
                } else {
                    item = new classObject();
                }*/
                if (classObject) {
                    item = new classObject($libraryItemData, $displayItemData);
                } else {
                    throw new Error('Не найден класс. ' + type + ' Для регистрации класса испольщуйте FlashLib.registerClass');
                }
        }

        /**
         * Получить объект класса по имени, включая полный путь к нему
         * @param {string} $name имя класса
         */
        function getClassByName($name) {
            let splittedName = $name.split('.');

            function getClass($splittedName, $parentItem) {
                if ($splittedName.length === 0) {
                    return $parentItem;
                }

                let name = $splittedName.shift();
                let item = $parentItem[name];
                return getClass($splittedName, item);
            }

            return getClass(splittedName, this.registeredClassesObject);
            //return getClass(splittedName, window);
        }

        return item;
    }

    /**
     * Создать графический жлемент (не из библиотеки)
     * @param {*} $displayItemData данне графического элемента
     * @param {string} $libraryName имя библиотеки
     * @returns {*}
     */
    createDisplayItemFromData($displayItemData, $libraryName) {
        let item = null;
        switch ($displayItemData.elementType) {
            case 'instance':
                item = this.createItemFromLibrary($displayItemData, $libraryName);
                break;
            case 'text':
                item = new this.TextField($displayItemData, $libraryName);
                break;
            case 'shape':
                item = new this.Shape($displayItemData, $libraryName);
                break;
        }

        return item;
    }

    /**
     * Назначение параметров элементу
     * @param {*} $item объкет которому назначаются параметры
     * @param {object} $displayItemData объект с параметрами которые нужно назначить
     */
    setDisplayItemProperties($item, $displayItemData) {
        $item.name = $displayItemData.name || '';
        $item.x = $displayItemData.x || 0;
        $item.y = $displayItemData.y || 0;
        $item.width = $displayItemData.width || $item.width;
        $item.height = $displayItemData.height || $item.height;
        $item.scale.x = $displayItemData.scaleX || $item.scale.x;
        $item.scale.y = $displayItemData.scaleY || $item.scale.y;
        /*$item.skew.x =  $displayItemData.skewX || $item.skew.x;
        $item.skew.y =  $displayItemData.skewY || $item.skew.y;*/
        $item.rotation = ($displayItemData.rotation * (Math.PI / 180)) || 0;
        $item.visible = $displayItemData.visible === undefined ? true : $displayItemData.visible;

        if ($displayItemData.filters) {
            this.addFiltersToDisplayItem($item, $displayItemData.filets);
        }
    }

    /**
     * Добавление фильтров
     * @param {*} $item элемент которому добавляются фильтры
     * @param {*} $filters массив с фильтрами
     */
    addFiltersToDisplayItem($item, $filters) {
        if (!$filters || !PIXI.filters) {
            return;
        }
        let filter = null;
        let newFilters = [];
        $filters.forEach(function (filterData) {
            if (filterData && filterData.enabled) {
                filter = null;
                switch (filterData.name) {
                    case 'glowFilter':
                        if (PIXI.filters.BlurFilter) {
                            console.log(filterData);
                            //let qualityList = {'low': 90, 'medium': 65, 'high': 40};
                            //filter = new PIXI.filters.GlowFilter(filterData.blurX, filterData.inner ? 0 : filterData.strength / 100, filterData.inner ? filterData.strength / 100 : 0, /*filterData.color*/ 0xff0000/*, qualityList[filterData.quality]*/);
                        }
                        break;
                    case 'dropShadowFilter':
                        if (PIXI.filters.DropShadowFilter) {
                            console.log(filterData);
                            /*let qualityList = {'low': 90, 'medium': 65, 'high': 40};
                            let options = {
                              alpha: filterData.strength,
                              blur: filterData.blurX,
                              color: filterData.color,
                              distance: filterData.distance,
                              quality: qualityList[filterData.quality],
                              shadowOnly: filterData.hideObject
                            }
                            filter = new PIXI.filters.DropShadowFilter(options);*/
                        }
                        break;
                    case 'bevelFilter':
                        if (PIXI.filters.BevelFilter) {
                            console.log(filterData);
                            //filter = new PIXI.filters.BevelFilter(1, 1, 1, 0xff0000, 1);
                        }
                        break;
                    case 'blurFilter':
                        if (PIXI.filters.BlurFilter) {
                            let qualityList = {'low': 90, 'medium': 65, 'high': 40};
                            filter = new PIXI.filters.BlurFilter(filterData.strength, qualityList[filterData.quality]);
                            filter.blurX = filterData.blurX;
                            filter.blurY = filterData.blurY;
                        }
                        break;
                }
                if (filter) {
                    newFilters.push(filter);
                }
            }
        }, this);
        $item.filters = newFilters;
    }
}
/*export {default as Shape} from './Shape';
export {default as Bitmap} from './Bitmap';
export {default as MovieClip} from './MovieClip';
export {default as TextField} from './TextField';*/
