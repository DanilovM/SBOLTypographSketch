const sketch = require('sketch')

var onRun = function (context) {
    var document = sketch.getSelectedDocument()
    var selection = document.selectedLayers

    var workResult = ""

    var _nbsp = '\u00A0'
    var _counterPunctuation = 0
    var _counterReplaceQuoteMarks = 0
    var _counterDeleteSpaces = 0
    var _counterRemoveEndDotInSingleString = 0
    var _counterAddNoBreakSpace = 0
    var _counterYO = 0
    var _counterDash = 0
    var _counterPhoneNumber = 0
    var _counterReplaceDotWithComma = 0
    var _counterRub = 0
    var _counterCurrency = 0
    var _counterLowerCase = 0
    var _counterOther = 0

    var _dataBeforeNBSP
    var _dataAfterNBSP
    var _yoDict = []
    var _phoneCodeRu
    var _dataMonth
    var _dataMonthShort
    var _dataWeekday
    var _dataWeekdayShort

    function readFile(fileName) {
        // Читаем файл из дирр. Resources
        const baseURL = context.scriptURL
        const pathToResources = baseURL
            .URLByDeletingLastPathComponent()
            .URLByAppendingPathComponent("../Resources/" + fileName)

        var fileContent = NSString.stringWithContentsOfFile(pathToResources)
        return fileContent
    }

    function dataFromFiles() {
        // Неразрывные пробелы
        // Читаем нужные частицы и предлоги из файла
        var noBreakSpaceFileContent = readFile("noBreakSpace.txt")
        // Пробелы ПЕРЕД
        var regexpBeforeNBSP = /(beforeNBSP = )(.*)/gm
        var matchBeforeNBSP = noBreakSpaceFileContent.match(regexpBeforeNBSP)
        _dataBeforeNBSP = matchBeforeNBSP[0].replace(regexpBeforeNBSP, "$2")

        // Пробелы ПОСЛЕ
        var regexpAfterNBSP = /(afterNBSP = )(.*)/gm
        var matchAfterNBSP = noBreakSpaceFileContent.match(regexpAfterNBSP)
        _dataAfterNBSP = matchAfterNBSP[0].replace(regexpAfterNBSP, "$2")

        // Читаем Ё файл
        const yoFileContent = readFile("yo.txt")
        var yoData = yoFileContent
        // На основе файла создаём ассоциативный массив
        // словоБезЁ — словоСЁ
        yoData = yoData.replace(/(.*ё.*)/gm, function (match, p1, offset, string) {
            // Добавление в массив пары ключ(слово_с_е)–значение(слово_с_ё)
            _yoDict[p1.replace(/ё/g, "е")] = p1
        })

        // Читаем файл с телефонными кодами России
        phoneCodeRuFileContent = readFile("phoneCodeRu.txt")
        _phoneCodeRu = phoneCodeRuFileContent

        // Читаем месяцы и дни недели из файла
        var monthWeekdayFileContent = readFile("monthWeekday.txt")
        // Месяц
        var regexpMonth = /(month = )(.*)/gm
        var matchMonth = monthWeekdayFileContent.match(regexpMonth)
        _dataMonth = matchMonth[0].replace(regexpMonth, "$2")
        // Месяц сокращённый
        var regexpMonthShort = /(monthShort = )(.*)/gm
        var matchMonthShort = monthWeekdayFileContent.match(regexpMonthShort)
        _dataMonthShort = matchMonthShort[0].replace(regexpMonthShort, "$2")
        // День недели
        var regexpWeekday = /(weekday = )(.*)/gm
        var matchWeekday = monthWeekdayFileContent.match(regexpWeekday)
        _dataWeekday = matchWeekday[0].replace(regexpWeekday, "$2")
        // День недели сокращённый
        var regexpWeekdayShort = /(weekdayShort = )(.*)/gm
        var matchWeekdayShort = monthWeekdayFileContent.match(regexpWeekdayShort)
        _dataWeekdayShort = matchWeekdayShort[0].replace(regexpWeekdayShort, "$2")
    }
    dataFromFiles()

    function selectedLayers() {

        var selectionCount = selection.length
        if (selectionCount === 0) {
            // Слои не выбраны
            // Тогда выбираем все артборды настранице
            var page = document.selectedPage
            selection = page.layers
        }
        layersParse(selection)
    }

    // Разбор слоёв в артбордах, группах, символах
    // Ищем текстовые слои
    function layersParse(arr) {
        arr.forEach(function (layer) {
            switch (layer.type) {
                case 'Text':
                    layer.text = runTypograph(layer.text)
                    break

                case 'Group':
                    if (layer.layers) {
                        layersParse(layer.layers)
                    }
                    break

                case 'Artboard':
                    if (layer.layers && layer.layers.length > 0) {
                        layersParse(layer.layers)
                    }
                    break

                case 'SymbolMaster':
                    layersParse(layer.layers)
                    break

                case 'SymbolInstance':
                    overridesParse(layer.overrides)
                    break

                case 'Shape':
                    break

                case 'ShapePath':
                    break

                case 'Image':
                    break

                default:
                    if (layer.layers) {
                        layersParse(layer.layers)
                    }
            }
        })
    }

    // Разбор слоёв в инстансах
    // Ищем текстовые оверайды
    function overridesParse(arr) {
        arr.forEach(function (override) {
            switch (override.affectedLayer.type) {
                case 'Text':
                    if (override.editable && override.property == 'stringValue') {
                        override.value = runTypograph(override.value)
                    }
                    break

                case 'SymbolInstance':
                    break

                case 'Shape':
                    break

                case 'ShapePath':
                    break

                case 'Image':
                    break

                default:
                    if (override.layers) {
                        layersParse(override.layers)
                    }
            }
        })
    }

    function runTypograph(stringToParse) {
        function punctuation() {
            // Заменяем ...? ⟶ ?‥ и ...! ⟶ !‥
            stringToParse = stringToParse.replace(/(\.{2,}|…)(\!|\?)/gm, function (match, p1, p2) {
                _counterPunctuation++
                return p2 + '\u2025'
            })
            // Заменяем ?... ⟶ ?‥ и !... ⟶ !‥
            stringToParse = stringToParse.replace(/(\!|\?)(\.{3,}|…)/gm, function (match, p1) {
                _counterPunctuation++
                return p1 + '\u2025'
            })
            // Заменяем ... на знак многоточия … U+2026
            stringToParse = stringToParse.replace(/\.{3,}/gm, function () {
                _counterPunctuation++
                return '\u2026'
            })
            // Заменяем несколько знаков ? на один
            stringToParse = stringToParse.replace(/(\?){2,}/gm, function (match, p1) {
                _counterPunctuation++
                return p1
            })
            // Заменяем несколько знаков ! на один
            stringToParse = stringToParse.replace(/(\!){2,}/gm, function (match, p1) {
                _counterPunctuation++
                return p1
            })
            // Заменяем несколько знаков . на один
            stringToParse = stringToParse.replace(/(\.){2,}/gm, function (match, p1) {
                _counterPunctuation++
                return p1
            })
            // Заменяем несколько знаков , на один
            stringToParse = stringToParse.replace(/(\,){2,}/gm, function (match, p1) {
                _counterPunctuation++
                return p1
            })
            // Заменяем несколько знаков ; на один
            stringToParse = stringToParse.replace(/(\;){2,}/gm, function (match, p1) {
                _counterPunctuation++
                return p1
            })
            // Заменяем несколько знаков : на один
            stringToParse = stringToParse.replace(/(\:){2,}/gm, function (match, p1) {
                _counterPunctuation++
                return p1
            })
            // Заменяем несколько знаков - на один
            stringToParse = stringToParse.replace(/(\-){2,}/gm, function (match, p1) {
                _counterPunctuation++
                return p1
            })
            // Заменяем !? ⟶ ?!
            stringToParse = stringToParse.replace(/(\!\?)/gm, function () {
                _counterPunctuation++
                return '?!'
            })
            // Переносим точку внутри кавычки наружу
            stringToParse = stringToParse.replace(/([^\.])(\.)([\u0022\»\“])(\.)?/gm, function (match, p1, p2, p3) {
                _counterPunctuation++
                return p1 + p3 + p2
            })
        }

        function replaceQuoteMarks() {
            // Левая кавычка: ищем " или “ или ‘    
            stringToParse = stringToParse.replace(/(^|\s)[\u0022\u201C\u2018]/g, function (match, p1) {
                _counterReplaceQuoteMarks++;
                return p1 + '«';
            });
            stringToParse = stringToParse.replace(/(«)[\u0022\u201C\u2018]/g, function (match, p1) {
                _counterReplaceQuoteMarks++;
                return p1 + '«';
            });

            // Правая кавычка: ищем " или ” или ’ перед которыми идёт не пробельный символ
            // и за которыми идут пробел , . … : ; ! ? ) } ] » " ' или конец строки
            stringToParse = stringToParse.replace(/([^\s])[\u0022\u201D\u2019]([\s\u0022\u0027\»\,\.\…\:\;\!\?\}\u0029\u005D]|$)/gm, function (match, p1, p2) {
                _counterReplaceQuoteMarks++;
                return p1 + '»' + p2;
            });
            stringToParse = stringToParse.replace(/(»)[\u0022\u201D\u2019]/g, function (match, p1) {
                _counterReplaceQuoteMarks++;
                return p1 + '»';
            });

            let newString1 = stringToParse;
            let newString2 = '';
            let previousQuote = '';
            // Заменяем кавычки внути кавычек
            for (let i = 0; i < newString1.length; i++) {
                if (newString1[i] === "«") {
                    if (previousQuote === "«" || previousQuote === "“") {
                        newString2 += "„";
                        previousQuote = "„";
                    } else {
                        newString2 += newString1[i];
                        previousQuote = "«";
                    }
                } else if (newString1[i] === "»") {
                    if (previousQuote === "„") {
                        newString2 += "“";
                        previousQuote = "“";
                    } else {
                        newString2 += newString1[i];
                        previousQuote = "»";
                    }
                } else {
                    newString2 += newString1[i];
                }

                stringToParse = newString2;
            }

        }


        function deleteSpaces() {
            // Удаляем пробелы ПОСЛЕ « „ ( [
            stringToParse = stringToParse.replace(/(\«|\„|\u0022|\u0028|\u005B)\s+/gm, function (match, p1) {
                _counterDeleteSpaces++
                return p1
            })

            // Удаляем пробелы ПЕРЕД . … : , ; ? ! » “ "" ) ]
            stringToParse = stringToParse.replace(/\s+(\.|\…|\:|\,|\;|\?|\!|\»|\“|\u0022|\u0029|\u005D)/gm, function (match, p1) {
                _counterDeleteSpaces++
                return p1
            })

            // Удаляем пробелы перед числом и %
            stringToParse = stringToParse.replace(/(\d)\s+(\%)/gm, function (match, p1, p2) {
                _counterDeleteSpaces++
                return p1 + p2
            })

            // Удаляем пробелы в начале и конце строки
            // Если в строке только пробельные символы, ничего не меняем
            if (stringToParse.search(/[^\s]/gm) != -1) {
                stringToParse = stringToParse.trim()
            }

            // Удаляем двойные пробелы
            stringToParse = stringToParse.replace(/(\u0020|\u00A0){2,}/gm, function () {
                _counterDeleteSpaces++
                return " "
            })
        }

        function removeEndDotInSingleString() {
            // Удаляем точку в конце одиночного предложения
            // Ищем . ! ? за ней пробел или перевод строки
            // Если найдено <=1, значит это одиночное предложение и удаляем точку в конце
            var searchString = stringToParse.search(/[\.|\!|\?][\s|$]/gm)
            if (searchString <= 1) {
                stringToParse = stringToParse.replace(/\.$/g, function () {
                    _counterRemoveEndDotInSingleString++
                    return ''
                })
            }

        }

        function addNoBreakSpace() {
            let regexp;
            // Неразрывный пробел между инициалами и фамилией
            // Инициалы слитно, неразрывный пробел, фамилия
            regexp = new RegExp('(^|[\\u0020«„\\"\\(\\[])([А-ЯЁ]\\.)\u0020?([А-ЯЁ]\\.)?\u0020?([А-ЯЁ][а-яё]+)([\\s.,;:?!\\"»“‘\\)\\]]|$)', 'gm');
            stringToParse = stringToParse.replace(regexp, function (match, p1, p2, p3, p4, p5) {
                _counterAddNoBreakSpace++;
                return p1 + p2 + (p3 ? p3 : '') + _nbsp + p4 + p5;
            });

            // Фамилия, неразрывный пробел, инициалы слитно
            regexp = new RegExp('(^|[\\u0020«„\\"\(\\[])([А-ЯЁ][а-яё]+)\\u0020?([А-ЯЁ]\\.)\\u0020?([А-ЯЁ]\\.)?([\\s.,;:?!\\"»“‘\\)\\]]|$)', 'gm');
            stringToParse = stringToParse.replace(regexp, function (match, p1, p2, p3, p4, p5) {
                _counterAddNoBreakSpace++;
                return p1 + p2 + _nbsp + p3 + (p4 ? p4 : '') + p5;
            });

            // Неразрывные пробелы между словом и и т.д. и т.п. и др.
            stringToParse = stringToParse.replace(/(.)\u0020+(и)\u0020+((т\.д\.)|(т\.п\.)|(др\.))/g, function (match, p1, p2, p3) {
                _counterAddNoBreakSpace++;
                return p1 + _nbsp + p2 + _nbsp + p3;
            });

            // Неразрывный пробел ПЕРЕД б, бы, ж, же, ли, ль
            regexpBefore = new RegExp('\\u0020(' + _dataBeforeNBSP + ')([^А-ЯЁа-яё])', 'gim');
            stringToParse = stringToParse.replace(regexpBefore, function (match, p1, p2) {
                _counterAddNoBreakSpace++;
                return _nbsp + p1 + p2;
            });

            // Неразрывный пробел ПОСЛЕ
            regexpAfter = new RegExp('(^|[\\u0020«„\\"\\(\\[])(' + _dataAfterNBSP + ')\\u0020', 'gim');
            stringToParse = stringToParse.replace(regexpAfter, function (match, p1, p2) {
                _counterAddNoBreakSpace++;
                return p1 + p2 + _nbsp;
            });

            // Неразрывный пробел ПОСЛЕ стр. гл. рис. илл. ст. п. c.
            regexpAfter = new RegExp('(^|[\\u0020«„\\"\\(\\[])(стр|гл|рис|илл?|ст|п|c)\\.\\u0020', 'gim');
            stringToParse = stringToParse.replace(regexpAfter, function (match, p1, p2) {
                _counterAddNoBreakSpace++;
                return p1 + p2 + '.' + _nbsp;
            })

            // Неразрывный пробел ПОСЛЕ №
            stringToParse = stringToParse.replace(/№([^\s])/gm, function (match, p1) {
                _counterAddNoBreakSpace++;
                return '№' + _nbsp + p1;
            });

            // Неразрывный пробел между числом и следующим словом
            stringToParse = stringToParse.replace(/(\d)\u0020+([a-zа-яё])/gi, function (match, p1, p2) {
                _counterAddNoBreakSpace++;
                return p1 + _nbsp + p2;
            });

            // Неразрывный пробел ПОСЛЕ сокращенй город, область, край, станция, поселок, село,деревня, улица, переулок, проезд, проспект,бульвар, площадь, набережная, шоссе, тупик, офис, комната, участок, владение, строение, корпус, дом, квартира, микрорайон
            stringToParse = stringToParse.replace(/(^|\,[\u0020\u00A0])(г|обл|кр|ст|пос|с|д|ул|пер|пр|пр-т|просп|пл|бул|б-р|наб|ш|туп|оф|кв|комн?|под|мкр|уч|вл|влад|стр|корп?|эт|пгт)\.\u0020?(\-?[А-ЯЁ\d])/gm, function (match, p1, p2, p3) {
                _counterAddNoBreakSpace++;
                return p1 + p2 + '.' + _nbsp + p3;
            });

            // Неразрывный пробел ПОСЛЕ дом
            stringToParse = stringToParse.replace(/(^|\,[\u0020\u00A0])(дом)\u0020(\d)/gm, function (match, p1, p2, p3) {
                _counterAddNoBreakSpace++;
                return p1 + p2 + _nbsp + p3;
            });

            // Неразрывный пробел ПОСЛЕ литер
            stringToParse = stringToParse.replace(/(^|\,[\u0020\u00A0])(литера?)\u0020([А-ЯЁ])/gm, function (match, p1, p2, p3) {
                _counterAddNoBreakSpace++;
                return p1 + p2 + _nbsp + p3;
            });

            // Неразрывный пробел ПОСЛЕ короткого слова
            regexp = new RegExp('(^|[\\u0020\\u00A0«„\\"\\(\\[])([А-ЯЁа-яё]{1,3})\\u0020', 'gim');
            stringToParse = stringToParse.replace(regexp, function (match, p1, p2) {
                _counterAddNoBreakSpace++;
                return p1 + p2 + _nbsp;
            });

            // Неразрывный пробел ПЕРЕД последним коротким словом в предложении или одиночной строке
            stringToParse = stringToParse.replace(/\u0020([а-яё]{1,3}[!?…»]?$)/gmi, function (match, p1) {
                _counterAddNoBreakSpace++;
                return _nbsp + p1;
            });
            regexp = new RegExp('\\u0020([а-яё]{1,3}[\\.!?…](\\u0020.|$))', 'gmi');
            stringToParse = stringToParse.replace(regexp, function (match, p1) {
                _counterAddNoBreakSpace++
                return _nbsp + p1
            });
            regexp = new RegExp('\\u0020([а-яё]{1,3}[\\.!?…][\\)\\]](\\u0020.|$))', 'gmi');
            stringToParse = stringToParse.replace(regexp, function (match, p1) {
                _counterAddNoBreakSpace++;
                return _nbsp + p1;
            });
            regexp = new RegExp('\\u0020([а-яё]{1,3}[\\)\\]][\\.!?…](\\u0020.|$))', 'gmi');
            stringToParse = stringToParse.replace(regexp, function (match, p1) {
                _counterAddNoBreakSpace++;
                return _nbsp + p1;
            });
            regexp = new RegExp('\\u0020([а-яё]{1,3}[!?…][\\"»](\\u0020.|$))', 'gmi');
            stringToParse = stringToParse.replace(regexp, function (match, p1) {
                _counterAddNoBreakSpace++;
                return _nbsp + p1;
            });
            regexp = new RegExp('\\u0020([а-яё]{1,3}[!?…]?[\\"»][\\.!?…](\\u0020.|$))', 'gmi');
            stringToParse = stringToParse.replace(regexp, function (match, p1) {
                _counterAddNoBreakSpace++;
                return _nbsp + p1;
            });
        }

        function YO() {
            // Разбиваем текст на слова
            re = new RegExp('([а-яё]+)', 'gmi')
            stringToParse = stringToParse.replace(re, function (match, p1, offset, string) {
                // Если слово есть в yoDict, заменяем его
                var wordLower = p1.toLowerCase()
                var wordAllCase = ''
                if (wordLower in _yoDict) {
                    yoDictWord = _yoDict[wordLower]
                    for (var i = 0; i < wordLower.length; i++) {
                        if (p1[i] == yoDictWord[i]) {
                            // Буква из слова равна букве из словарного слова
                            wordAllCase = wordAllCase + p1[i]
                        } else {
                            // Буквы не совпадают. Или не тот регистр или е ё
                            // Узнаём регистр буквы основного слова
                            if (p1[i] === p1[i].toUpperCase()) {
                                // в верхнем --------------
                                if (p1[i] === yoDictWord[i].toUpperCase()) {
                                    // Сравниваем букву в верхнем регистре основного слова с буквой в верхнем регистре словарного слова
                                    // Если совпадают, дописываем
                                    wordAllCase = wordAllCase + p1[i]
                                } else {
                                    // Не совпадают, значит это замена е на ё
                                    wordAllCase = wordAllCase + yoDictWord[i].toUpperCase()
                                }
                            } else {
                                // в нижнем --------------
                                // Не совпадают, значит это замена е на ё
                                wordAllCase = wordAllCase + yoDictWord[i]
                            }
                        }
                    }
                    p1 = wordAllCase
                    _counterYO++
                }
                return p1
            })

        }

        function phoneNumber() {
            // Федеральный номер 8 800
            // Формат номера 8 (800) 555-55-50
            // [\+\(]?\u0020?(8)[\u0020]?[-]?[\(]?(800)[\u0020]?[-]?[\)]?[\u0020-]?(\d)[\u0020-]?(\d)[\u0020-]?(\d)[\u0020-]?(\d)[\u0020-]?(\d)[\u0020-]?(\d)[\u0020-]?(\d)
            // Пробел или неразрывный пробел
            let spaceTmpl = '[\\u0020\\u00A0]?';
            // Любое тире
            let dashTmpl = '[\\u002D\\u2012\\u2013\\u2014]?';
            // Пробел или неразрывный пробел или любое тире
            let spaceDashTmpl = '[\\u0020\\u00A0\\u002D\\u2012\\u2013\\u2014]?';
            let phoneNumber = '';
            // Специальный символ для тире в тел. номере. Нужен, что бы при замене тире, не менялся на среднее тире между цифрами
            // В конце функции dash() заменится обратно на -
            let specialDash = '';

            let reFederal = new RegExp('(' + spaceTmpl + ')[\\+\\(]*?' + spaceTmpl + '(8)' + spaceTmpl + '' + dashTmpl + '\\(?(800)' + spaceTmpl + '' + dashTmpl + '[\\)]?' + spaceDashTmpl + '(\\d)' + spaceDashTmpl + '(\\d)' + spaceDashTmpl + '(\\d)' + spaceDashTmpl + '(\\d)' + spaceDashTmpl + '(\\d)' + spaceDashTmpl + '(\\d)' + spaceDashTmpl + '(\\d)', 'gm');
            stringToParse = stringToParse.replace(reFederal, function (match, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10) {
                specialDash = '\u002D';
                phoneNumber = p1 + p2 + _nbsp + '(' + p3 + ')' + _nbsp + p4 + p5 + p6 + specialDash + p7 + p8 + specialDash + p9 + p10;
                if (match != phoneNumber) {
                    _counterPhoneNumber++;
                }
                // Заменяем - на спецсимвол
                specialDash = '<phoneDash>';
                phoneNumber = p1 + p2 + _nbsp + '(' + p3 + ')' + _nbsp + p4 + p5 + p6 + specialDash + p7 + p8 + specialDash + p9 + p10;

                return phoneNumber;
            });

            // В номерах телефонов +7 (333) 333-22-22 используем дефис без пробелов
            // +7 вместо 8
            // Если трёхзначный код города, формат номера +7 (111) 111-11-11
            // Если четырёхзначный код города, формат номера +7 (1111) 11-11-11
            let reRu = new RegExp('(' + spaceTmpl + ')[\\+\\(]*?' + spaceTmpl + '(7|8)' + spaceTmpl + '' + dashTmpl + '\\(?(' + _phoneCodeRu + ')' + spaceTmpl + '' + dashTmpl + '[\\)]?' + spaceDashTmpl + '(\\d)' + spaceDashTmpl + '(\\d)' + spaceDashTmpl + '(\\d)' + spaceDashTmpl + '(\\d)' + spaceDashTmpl + '(\\d)' + spaceDashTmpl + '(\\d)?' + spaceDashTmpl + '(\\d)?', 'gm');

            stringToParse = stringToParse.replace(reRu, function (match, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10) {
                p2 = '7';
                specialDash = '\u002D';
                if (p3.length == 3) {
                    phoneNumber = p1 + '+' + p2 + _nbsp + '(' + p3 + ')' + _nbsp + p4 + p5 + p6 + specialDash + p7 + p8 + specialDash + p9 + p10;
                } else if (p3.length == 4) {
                    phoneNumber = p1 + '+' + p2 + _nbsp + '(' + p3 + ')' + _nbsp + p4 + p5 + specialDash + p6 + p7 + specialDash + p8 + p9;
                }
                if (match != phoneNumber) {
                    _counterPhoneNumber++;
                }

                // Заменяем - на спецсимвол
                specialDash = '<phoneDash>';
                if (p3.length == 3) {
                    phoneNumber = p1 + '+' + p2 + _nbsp + '(' + p3 + ')' + _nbsp + p4 + p5 + p6 + specialDash + p7 + p8 + specialDash + p9 + p10;
                } else if (p3.length == 4) {
                    phoneNumber = p1 + '+' + p2 + _nbsp + '(' + p3 + ')' + _nbsp + p4 + p5 + specialDash + p6 + p7 + specialDash + p8 + p9;
                }
                return phoneNumber;

            });

            // Короткий номер — только 900: без плюсов и других знаков
            stringToParse = stringToParse.replace(/(^|\D)(\+900|\#900|\@900)(\D|$)/gm, function (match, p1, p2, p3) {
                _counterPhoneNumber++;
                return p1 + '900' + p3;
            });
        }

        function dash() {
            // Там, где по смыслу необходимо тире, используем длинное «—» и отбиваем его пробелами с двух сторон.
            // Для диапазонов чисел используем короткое (среднее) тире «–» без пробелов: 2002–2009.
            // Дефис «-» применяем для присоединения частиц (что-то), присоединения префиксов (по-человечески), 
            // в сложносоставных словах (интернет-банк) и в номерах телефонов +7 (333) 333-22-22.

            // Все виды тире
            dashAll = '[\\u002D\\u2012\\u2013\\u2014]'

            // В начале строки или предложения, длинное тире + неразрывный пробел
            // Сначала меняем тире
            // Затем ставим неразрывный пробел, если надо
            var re = new RegExp('(^|[\\.|\\!|\\?][\\u0020\\u00A0])(' + dashAll + ')(.)?', 'gm')
            stringToParse = stringToParse.replace(re, function (match, p1, p2, p3) {
                if (p2 != '\u2014') {
                    p2 = '\u2014'
                    _counterDash++
                }
                if (p3 == '\u0020') {
                    p3 = _nbsp
                    _counterAddNoBreakSpace++
                }
                if (p3 != _nbsp) {
                    p3 = _nbsp + p3
                    _counterAddNoBreakSpace++
                }
                return p1 + p2 + p3
            })

            // Для диапазонов месяцев и дней недели используем короткое (среднее) тире «–» без пробелов: январь–март, понедельник-суббота
            function monthWeekday(params) {
                var re = new RegExp('((' + params + ')\\.?)([\\u0020\\u00A0])?(' + dashAll + ')([\\u0020\\u00A0])?((' + params + ')\.?)', 'gmi')
                stringToParse = stringToParse.replace(re, function (match, p1, p2, p3, p4, p5, p6, p7) {
                    if (p4 != '\u2013') {
                        p4 = '\u2013'
                        _counterDash++
                    }
                    if (p3 !== undefined) {
                        _counterDeleteSpaces++
                    }
                    if (p5 !== undefined) {
                        _counterDeleteSpaces++
                    }
                    return p1 + p4 + p6
                })
            }
            // Месяц
            monthWeekday(_dataMonth)
            // Месяц сокращённо
            monthWeekday(_dataMonthShort)
            // День недели
            monthWeekday(_dataWeekday)
            // День недели сокращённо
            monthWeekday(_dataWeekdayShort)

            // Внутри текста используем неразрывный пробел + длинное тире
            re = new RegExp('([^\\.\\!\\?\\dXIV])([\\u0020\\u00A0])(' + dashAll + ')([\\u0020\\u00A0])?([^\\dXIV])', 'gm')
            stringToParse = stringToParse.replace(re, function (match, p1, p2, p3, p4, p5) {
                if (p2 == '\u0020') {
                    p2 = _nbsp
                    _counterAddNoBreakSpace++
                }
                if (p3 != '\u2014') {
                    p3 = '\u2014'
                    _counterDash++
                }
                if (p4 != '\u20A0') {
                    p4 = '\u0020'
                }
                return p1 + p2 + p3 + p4 + p5
            })

            // Для диапазонов чисел используем короткое (среднее) тире «–» без пробелов: 2002–2009 + века XI–XII
            re = new RegExp('(\\d|[XIV])([\\u0020\\u00A0])?(' + dashAll + ')([\\u0020\\u00A0])?(\\d|[XIV])', 'gm')
            stringToParse = stringToParse.replace(re, function (match, p1, p2, p3, p4, p5) {
                if (p3 != '\u2013') {
                    p3 = '\u2013'
                    _counterDash++
                }
                p2 = p4 = ''
                return p1 + p2 + p3 + p4 + p5
            })

            // Заменяем <phoneDash> из функции phoneNumber() на короткое тире
            stringToParse = stringToParse.replace(/<phoneDash>/gm, function (match, p1) {
                return '\u002D'
            })


        }

        function lowerCase() {
            // Слова «вы», «банк», «приложение», «условия», «сайт» — со строчной (маленькой) буквы. 
            // Обращение на «вы» с прописной буквы, только если «вы» — первое слово в предложении. 

            function toLowerCase(params) {
                // Находим первое слово из списка в предложении и отмечаем его как не изменяемое
                var regexp = new RegExp('(^|[\\.\\!\\?\\…][\\u0020\\u00A0])(\\u2014[\\u0020\\u00A0])?(' + params + ')(?=[\\u0020\\u00A0\\…\\,\\;\\:\\?\\!\\"»“‘\\)\\]])', 'gm')
                stringToParse = stringToParse.replace(regexp, function (match, p1, p2, p3) {
                    if (p2 === undefined) {
                        p2 = ''
                    }
                    return p1 + p2 + '<noReplace>' + p3 + '<noReplace>'
                })
                // Заменяем все вхождения из списка на нижний регистр
                regexp = new RegExp('(^|[\\u0020\\u00A0«„\\"\\(\\[])(' + params + ')(?=[\\u0020\\u00A0\\…\\,\\;\\:\\?\\!\\"»“‘\\)\\]])', 'gm')
                stringToParse = stringToParse.replace(regexp, function (match, p1, p2) {
                    _counterLowerCase++
                    return p1 + p2.toLowerCase()
                })
                // Удаляем маркер
                stringToParse = stringToParse.replace(/<noReplace>/g, "")
            }
            toLowerCase('Вы|Вас|Вам|Вами|Ваш|Ваше|Вашего|Ваша|Вашей|Ваши|Ваших')
            toLowerCase('Банк|Банки|Банка|Банков|Банку|Банкам|Банком|Банками|Банке|Банках')
            toLowerCase('Приложение|Приложения|Приложений|Приложению|Приложениям|Приложением|Приложениями|Приложении|Приложениях|Приложении')
            toLowerCase('Условие|Условия|Условий|Условию|Условиям|Условием|Условиями|Условии|Условиях')
            toLowerCase('Сайт|Сайта|Сайту|Сайтом|Сайте|Сайты|Сайтов|Сайтам|Сайты|Сайтами|Сайтах')
        }

        function numbers() {
            // Если за числом идёт знак %, валюты или млн., трлн и т.д. разбиваем по разрядам только четырёх и более значную целую часть
            // Дробную часть не разбиваем
            // Заменяем точку на запятую

            stringToParse = stringToParse.replace(/(\d+)(([.,])(\d+))?((\u00A0(тыс|млн|млрд|трлн|₽|\$|€|£|¥))|%)/g, function (match, p1, p2, p3, p4, p5) {
                // p1 — целая часть
                // p2 – разделитель и дробная часть, если есть
                // p3 — разделитель
                // p4 — дробная часть
                // p5 — валюта или %

                let integerPart = p1;
                if (p1.length >= 4 || p5 !== undefined) {
                    integerPart = p1.replace(/(\d)(?=(\d{3})+([\D]|$))/g, function (match, a1) {
                        _counterAddNoBreakSpace++;
                        return a1 + _nbsp;
                    });
                }

                let fractionalPart;
                if (p2 === undefined) {
                    fractionalPart = '';
                } else {
                    fractionalPart = ',' + p4;
                    _counterReplaceDotWithComma++;
                }

                let currencyPart = '';
                if (p5 !== undefined) {
                    currencyPart = p5;
                }

                return integerPart + fractionalPart + currencyPart;
            });

            // Если число формата XX,XX,XXXX или XX,XX,ХХ меняем запятую на точку
            stringToParse = stringToParse.replace(/(^|\D)(\d{2})\,(\d{2})\,(\d{2,4})($|\D)/gm, function (match, p1, p2, p3, p4, p5) {
                _counterReplaceDotWithComma++;
                return p1 + p2 + '.' + p3 + '.' + p4 + p5;
            });
        }

        function currency() {
            // Правило гласит, что, если сокращение образовано отсечением части слова, точка ставится (тыс., г., стр.). 
            // Если же сокращение состоит из согласных, а гласные при этом опущены, причем последняя согласная 
            // является последней буквой полного слова, точка не ставится (млн, млрд, трлн).

            // После тыс должна быть точка
            stringToParse = stringToParse.replace(/(тыс)([!?,:;\u00A0\u0020\n]|$)/gmi, function (match, p1, p2) {
                return p1 + '.' + p2
            })
            // После млн млрд трлн точки быть не должно
            stringToParse = stringToParse.replace(/(млн|млрд|трлн)\./gmi, function (match, p1, p2) {
                return p1
            })
            // Ставим точку после млн млрд трлн, если это конец предложения
            stringToParse = stringToParse.replace(/(млн|млрд|трлн)(\u0020|\u00A0)((«|—(\u0020|\u00A0))?[А-ЯЁ])/gm, function (match, p1, p2, p3) {
                return p1 + '.' + p2 + p3
            })
            // Переводим USD в $ 
            stringToParse = stringToParse.replace(/(\d|тыс\.|млн|млрд|трлн)(\u0020|\u00A0)?(USD)\.?([!?,:;\u00A0\u0020\n]|$)/gmi, function (match, p1, p2, p3, p4) {
                _counterCurrency++
                _counterAddNoBreakSpace++
                return p1 + _nbsp + '$' + p4
            })
            // Переводим EUR в €
            stringToParse = stringToParse.replace(/(\d|тыс\.|млн|млрд|трлн)(\u0020|\u00A0)?(EUR)\.?([!?,:;\u00A0\u0020\n]|$)/gmi, function (match, p1, p2, p3, p4) {
                _counterCurrency++
                _counterAddNoBreakSpace++
                return p1 + _nbsp + '€' + p4
            })
            // Переводим Р, р., руб. RUR RUB в ₽ 
            stringToParse = stringToParse.replace(/(\d|тыс\.|млн|млрд|трлн)(\u0020|\u00A0)?(р|руб|RUR|RUB)\.?([!?,:;\u00A0\u0020\n]|$)/gmi, function (match, p1, p2, p3, p4) {
                _counterRub++
                _counterAddNoBreakSpace++
                return p1 + _nbsp + '₽' + p4
            })
            // Убираем копейки в основную сумму
            stringToParse = stringToParse.replace(/(\d)(\u00A0₽)(\u0020|\u00A0)(\d{1,2})(\u0020|\u00A0)?(к|коп)\.?([!?,:;\u00A0\u0020\n]|$)/gmi, function (match, p1, p2, p3, p4, p5, p6, p7) {
                var kop
                if (p4.length == 1) {
                    kop = '0' + p4
                } else {
                    kop = p4
                }
                return p1 + ',' + kop + p2 + p7
            })
            // Ставим точку после ₽, если это конец предложения
            stringToParse = stringToParse.replace(/(\d\u00A0₽)(\u0020|\u00A0)((«|—(\u0020|\u00A0))?[А-ЯЁ])/gm, function (match, p1, p2, p3) {
                return p1 + '.' + p2 + p3
            })
            // Переносим знак валюты после цифр и отделяем неразрывным пробелом
            // $123 ⟶ 123 $   ₽ 50 тыс. ⟶ 50 тыс. ₽
            stringToParse = stringToParse.replace(/(^|[\D]{2})(₽|\$|€|£|¥)[\u0020\u00A0]?(\d+([\u0020\u00A0]\d{3})*([.,]\d+)?)([\u0020\u00A0]?(тыс\.|млн|млрд|трлн))?/gm, function (match, p1, p2, p3, p4, p5, p6, p7) {
                var sokr
                if (p7 === undefined) {
                    sokr = ''
                } else {
                    sokr = _nbsp + p7
                }
                _counterCurrency++
                _counterAddNoBreakSpace++
                return p1 + p3 + sokr + _nbsp + p2
            })
            // Отделяем знак валюты от числа неразрывным пробелом
            stringToParse = stringToParse.replace(/(\d)(\u0020)?(₽|\$|€|£|¥)/gm, function (match, p1, p2, p3) {
                _counterAddNoBreakSpace++
                return p1 + _nbsp + p3
            })
        }

        function misc() {
            // СберБанк Онлайн
            // stringToParse = stringToParse.replace(/(Сбербанк|Сбер[\u0020\u00A0]банк)/gmi, function (match, p1) {
            //   if (match != 'СберБанк') {
            //     _counterOther++
            //   }
            //   return 'СберБанк'
            // })

            // Mastercard
            stringToParse = stringToParse.replace(/(Master[\u0020\u00A0]Card|MasterCard)/gmi, function (match, p1) {
                if (match != 'Mastercard') {
                    _counterOther++;
                }
                return 'Mastercard';
            });

            // Visa
            stringToParse = stringToParse.replace(/(VISA)/gm, function (match, p1) {
                _counterOther++;
                return 'Visa';
            });

            // Мир
            stringToParse = stringToParse.replace(/(МИР)/gm, function (match, p1) {
                _counterOther++;
                return 'Мир';
            });

            // Google Pay
            stringToParse = stringToParse.replace(/(Googlepay|Google[\u0020\u00A0]pay|Гугл[\u0020\u00A0]Пэй)/gmi, function (match, p1) {
                if (match != 'Google\u00A0Pay') {
                    _counterOther++;
                }
                return 'Google\u00A0Pay';
            });

            // Apple Pay
            stringToParse = stringToParse.replace(/(Applepay|Apple[\u0020\u00A0]pay|Эпл[\u0020\u00A0]Пэй)/gmi, function (match, p1) {
                if (match != 'Apple\u00A0Pay') {
                    _counterOther++;
                }
                return 'Apple\u00A0Pay';
            });

            // Push-уведомления
            stringToParse = stringToParse.replace(/(push|пуш)([\u0020\u00A0\u002D\u2012\u2013\u2014])(уведомлен)([ие|ия|ий|ию|иям|ием|иями|ии|иях])/gmi, function (match, p1, p2, p3, p4) {
                if ((p1 + p2 + p3) != 'Push-уведомлен') {
                    _counterOther++;
                }
                return 'Push-' + p3.toLowerCase() + p4.toLowerCase();
            });

            // ПИН-код
            stringToParse = stringToParse.replace(/(pin|пин)([\u0020\u00A0\u002D\u2012\u2013\u2014])(код)([ы|а|ов|у|ам|ы|ом|ами|е|ах])?/gmi, function (match, p1, p2, p3, p4) {
                if ((p1 + p2 + p3) != 'ПИН-код') {
                    _counterOther++;
                }
                if (p4 === undefined) {
                    p4 = '';
                }
                return 'ПИН-' + p3.toLowerCase() + p4.toLowerCase();
            });

            // QR-код
            stringToParse = stringToParse.replace(/(QR)([\u0020\u00A0\u002D\u2012\u2013\u2014])(code|код)([ы|а|ов|у|ам|ы|ом|ами|е|ах])?/gmi, function (match, p1, p2, p3, p4) {
                if ((p1 + p2 + p3) != 'QR-код') {
                    _counterOther++;
                }
                if (p4 === undefined) {
                    p4 = '';
                }
                return 'QR-' + p3.toLowerCase() + p4.toLowerCase();
            });

            // сим-карта
            stringToParse = stringToParse.replace(/((^|\n|[\.\!\?\…][\u0020\u00A0])(\u2014[\u0020\u00A0])?)?(sim|сим)([\u0020\u00A0\u002D\u2012\u2013\u2014])(карт)([а|ы|е|ам|у|ы|ой|ами|ах])?/gmi, function (match, p1, p2, p3, p4, p5, p6, p7) {
                let sim;
                if (p1 !== undefined) {
                    sim = 'Сим-карт';
                } else {
                    sim = 'сим-карт';
                    p1 = '';
                }
                if ((p4 + p5 + p6) != sim) {
                    _counterOther++;
                }
                if (p7 === undefined) {
                    p7 = '';
                }
                return p1 + sim + p7.toLowerCase();
            });

            // СVV-код, СVС-код, СVV2-код, СVС2-код, CVV, CVC
            stringToParse = stringToParse.replace(/(cvv|cvc|cvv2|cvc2)([\u0020\u00A0\u002D\u2012\u2013\u2014])?(код)?([ы|а|ов|у|ам|ы|ом|ами|е|ах])?/gmi, function (match, p1, p2, p3, p4) {
                if (p2 === undefined && p3 === undefined) {
                    if (p1 != 'CVV' && p1 != 'CVC' && p1 != 'CVV2' && p1 != 'CVC2') {
                        _counterOther++;
                    }
                } else {
                    if ((p1 != 'CVV' && p1 != 'CVC' && p1 != 'CVC2') || ((p2 + p3) != '-код')) {
                        _counterOther++;
                    }
                }
                if (p2 === undefined) {
                    p2 = '';
                } else {
                    p2 = '-';
                }
                if (p3 === undefined) {
                    p3 = '';
                }
                if (p4 === undefined) {
                    p4 = '';
                }
                return p1.toUpperCase() + p2 + p3.toLowerCase() + p4.toLowerCase();
            });

            // СМС
            stringToParse = stringToParse.replace(/(sms|смс)/gmi, function (match, p1) {
                if (match != 'СМС') {
                    _counterOther++;
                }
                return 'СМС';
            });

            // Wi-Fi
            stringToParse = stringToParse.replace(/(wifi|wi-fi)/gmi, function (match, p1) {
                if (match != 'Wi-Fi') {
                    _counterOther++;
                }
                return 'Wi-Fi';
            });

            // email
            stringToParse = stringToParse.replace(/((^|\n|[\.\!\?\…][\u0020\u00A0])(\u2014[\u0020\u00A0])?)?(e-mail|email|имейл|емейл)/gmi, function (match, p1, p2, p3, p4) {
                let email;
                if (p1 !== undefined) {
                    email = 'Email';
                } else {
                    email = 'email';
                    p1 = '';
                }
                if (p4 != email) {
                    _counterOther++;
                }
                return p1 + email;
            });

            // офлайн
            stringToParse = stringToParse.replace(/(((^|\n|[\.\!\?\…][\u0020\u00A0])(\u2014[\u0020\u00A0])?)|((^|\n|[\.\!\?\…][\u0020\u00A0]?)\u00AB))?(оффлайн|офлайн|офф-лайн|оф-лайн)/gmi, function (match, p1, p2, p3, p4, p5, p6, p7) {
                let offline;
                if (p1 !== undefined) {
                    offline = 'Офлайн';
                } else {
                    offline = 'офлайн';
                    p1 = '';
                }
                if (p7 != offline) {
                    _counterOther++;
                }
                return p1 + offline;
            });

            // онлайн
            stringToParse = stringToParse.replace(/(((^|\n|[\.\!\?\…][\u0020\u00A0])(\u2014[\u0020\u00A0])?)|((^|\n|[\.\!\?\…][\u0020\u00A0]?)\u00AB)|(Сбербанк)[\u0020\u00A0])?(оннлайн|онлайн|онн-лайн|он-лайн|Онлайн)/gmi, function (match, p1, p2, p3, p4, p5, p6, p7, p8) {
                let online;
                if (p1 !== undefined) {
                    online = 'Онлайн';
                } else {
                    online = 'онлайн';
                    p1 = '';
                }

                if (p8 != online) {
                    _counterOther++;
                }
                return p1 + online;
            });

            // мск
            stringToParse = stringToParse.replace(/(мск|msk)/gmi, function (match, p1) {
                if (match != 'мск') {
                    _counterOther++;
                }
                return 'мск';
            });
        }

        punctuation()
        replaceQuoteMarks()
        deleteSpaces()
        removeEndDotInSingleString()
        addNoBreakSpace()
        YO()
        phoneNumber()
        dash()
        currency()
        numbers()
        lowerCase()
        misc()
        return stringToParse
    }
    selectedLayers()

    if (_counterPunctuation > 0) {
        workResult = workResult + "Знаков пунктуации исправлено: " + _counterPunctuation + "\n"
    }
    if (_counterDeleteSpaces > 0) {
        workResult = workResult + "Лишних пробелов удалено: " + _counterDeleteSpaces + "\n"
    }
    if (_counterRemoveEndDotInSingleString > 0) {
        workResult = workResult + "Точек в заголовках удалено: " + _counterRemoveEndDotInSingleString + "\n"
    }
    if (_counterReplaceQuoteMarks > 0) {
        workResult = workResult + "Кавычек заменено:  " + _counterReplaceQuoteMarks + "\n"
    }
    if (_counterAddNoBreakSpace > 0) {
        workResult = workResult + "Неразрывных пробелов проставлено:  " + _counterAddNoBreakSpace + "\n"
    }
    if (_counterDash > 0) {
        workResult = workResult + "Тире заменено:  " + _counterDash + "\n"
    }
    if (_counterReplaceDotWithComma > 0) {
        workResult = workResult + "Точек в числах заменено:  " + _counterReplaceDotWithComma + "\n"
    }
    if (_counterRub > 0) {
        workResult = workResult + "Знаков рубля проставлено:  " + _counterRub++ + "\n"
    }
    if (_counterCurrency > 0) {
        workResult = workResult + "Знаков валюты исправлено:  " + _counterCurrency++ + "\n"
    }
    if (_counterPhoneNumber > 0) {
        workResult = workResult + "Телефонных номеров исправлено:  " + _counterPhoneNumber + "\n"
    }
    if (_counterLowerCase > 0) {
        workResult = workResult + "Слов в нижний регистр переведено:  " + _counterLowerCase + "\n"
    }
    if (_counterYO > 0) {
        workResult = workResult + "Е на Ё заменено:  " + _counterYO + "\n"
    }
    if (_counterOther > 0) {
        workResult = workResult + "Разное:  " + _counterOther + "\n"
    }

    if (workResult == '') {
        workResult = 'Ничего не исправлено'
    } else {
        workResult = workResult
    }
    // Вызываем окно с результатами работы
    sketch.UI.alert("SBOL Typograph", workResult);
}


/*
U+00A0	Неразрывный пробел  no-break space
U+0020  Пробел  space

U+0022	"	Кавычка
U+0027	'	Апостроф
U+00AB	«	Левая французская кавычка
U+00BB	»	Правая французская кавычка
U+201E	„	Левая немецкая кавычка
U+201C	“	Правая немецкая кавычка

U+2014  — Длинное тире  em dash
U+2013  – Среднее (короткое) тире  en dash
U+002D	-	Дефис
U+2012  ‒ Цифровое тире

U+0028	(	Левая скобка
U+0029	)	Правая скобка
U+005B	[	Левая квадратная скобка
U+005D	]	Правая квадратная скобка
U+007B	{	Левая фигурная скобка
U+007D	}	Правая фигурная скобка

U+002A	*	Звёздочка
U+002B	+	Знак плюса
U+002D	-	Дефис
U+003D	=	Знак равенства
U+003C	<	Знак «меньше»
U+003E	>	Знак «больше»
U+00B1	±	Знак плюс-минус
U+00F7	÷	Знак деления
U+00D7	×	Знак умножения
U+0025	%	Знак процента

U+002E	.	Точка
U+003A	:	Двоеточие
U+002C	,	Запятая
U+003B	;	Точка с запятой
U+003F	?	Вопросительный знак
U+0021	!	Восклицательный знак
U+2026  … Многоточие
U+2025  ‥ Две точки

U+20BD  ₽ Символ рубля
U+0024	$	Символ доллара
U+20AC  € Символ евро
U+00A2	¢	Символ цента
U+00A3	£	Символ фунта
U+00A5	¥	Символ иены
U+00A4	¤	Символ валюты

U+007C	|	Вертикальная черта
U+00A6	¦	Разорванная вертикальная черта
U+002F	/	Косая черта
U+005C	\	Обратная косая черта[A]

U+0023	#	Знак решётки
U+0026	&	Амперсанд
U+0040	@	Знак «at»
U+005E	^	Карет
U+005F	_	Подчёркивание
U+0060	`	Машинописный обратный апостроф
U+00A1	¡	Перевёрнутый восклицательный знак
U+00A7	§	нак параграфа
U+00A8	¨	Диерезис
U+00A9	©	Знак охраны авторского права
U+00AE	®	Знак правовой охраны товарного знака
U+00AD	­	Мягкий перенос
U+00AF	¯	Макрон
U+00B0	°	Знак градуса
U+00B7	·	Интерпункт
U+007E	~	tilde	Тильда

*/