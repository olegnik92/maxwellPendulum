
angular.module('maxwellPendulum', [])
    .factory('svg', ['$window', function ($window) {
        var svg = new Snap("#svg-paper");
        svg.domEl = $window.document.getElementById("svg-paper");
        svg.cY = function (y) {
            return y - this.domEl.getBoundingClientRect().top;
        };
        svg.cX = function (x) {
            return x - this.domEl.getBoundingClientRect().left;
        };
        return svg;
    }])
    .controller('maxwellPendulumController', ['$scope', 'svg', function ($scope, svg) {
        var cnst = {
            cmSize: 5,
            axisX: 80,
            axisStart: 580,
            lineMax: 100,
            lineMin: 10,
            g: 9.8,
            disc: {
                r: 0.03,
                m: 0.01,
                I: 0.03 * 0.03 * 0.01 * 0.5,
            }
        }


        drawStaticContent();

        $scope.timer = new Timer(130, 565);
        $scope.lineLength = 100;
        $scope.stand = new InteractiveStand();
        $scope.$watch('lineLength', function (val, prev) {
            if ($scope.timer.value()) {
                $scope.lineLength = $scope.stand.getLineHeight();
                return;
            }
            $scope.stand.setLineHeight(Number(val));
        });

        $scope.simulator = new Simulator();

        function drawStaticContent() {
            drawRuler();
            drawBlock();
            drawStand();


            function drawRuler() {
                var cmLen = cnst.cmSize;
                var start = cnst.axisStart;
                var smallLineAttr = { stroke: '#000000', strokeWidth: 1, transform: 't 0.5 0.5' };
                var lineLen = 10;
                for (var i = 0; i <= 100; i++) {
                    if (i % 10 === 0) {
                        lineLen = 35;
                    } else if (i % 5 === 0) {
                        lineLen = 15;
                    } else {
                        lineLen = 10;
                    }
                    svg.line(40, start - i * cmLen, 40 - lineLen, start - i * cmLen).attr(smallLineAttr);
                }

                for (i = 0; i <= 100; i += 10) {
                    svg.text(1, start - i * cmLen - 1, i.toString());
                }
                svg.text(5, start + 10, 'см');
            };

            function drawBlock() {
                var hight = 10;
                var lineStyle = { stroke: '#000000', strokeWidth: 2 };
                svg.line(0, hight, 125, hight).attr(lineStyle);
                var path = '';
                for (var i = 0; i <= 125; i += 20) {
                    path += ('M' + i + ' 10' + ' L' + (i - 10) + ' 0 ');
                }
                svg.path(path).attr(lineStyle);
            };

            function drawStand() {
                var bottom = 640;
                var fillStyle = svg.gradient('l(0,0,0,1)rgb(9, 175, 255)-rgb(0, 100, 255)')
                var standAttr = { fill: fillStyle, stroke: '#000000', strokeWidth: 1 };
                var weights = svg.rect(25, bottom - 10, 100, 10).attr(standAttr);
                var timerBlock = svg.rect(125, bottom - 80, 370, 80).attr(standAttr);

                svg.group(weights, timerBlock).transform('t 0.5, 0.5');
            };
        };


        function Timer(posX, posY) {
            var self = this;
            self.start = startTimer;
            self.stop = stopTimer;

            var dispaly = svg.rect(posX, posY, 100, 30).attr({ fill: '#00f', stroke: '#000000', strokeWidth: 2 });
            var timerText = svg.text(posX + 5, posY + 25, '0.00').attr({ fontSize: 30, fill: '#fff' });
            var timerTime = 0;

            var buttonFill = svg.gradient('l(0,0,0,1)rgb(200, 200, 200)-rgb(100, 100, 100)');
            var buttonPushedFill = svg.gradient('l(0,0,0,1)rgb(100, 100, 100)-rgb(200, 200, 200)');
            var startButtonRect = svg.rect(posX + 110, posY, 100, 30).attr({ stroke: '#000000', strokeWidth: 2, fill: buttonFill });
            var startButtonText = svg.text(posX + 125, posY + 22, 'Старт').attr({ fontSize: 25 });
            var startButton = svg.group(startButtonRect, startButtonText).attr({ cursor: 'pointer' });
            startButton.mousedown(function () {
                startButtonRect.attr({ fill: buttonPushedFill });
            }).click(function () {
                startButtonRect.attr({ fill: buttonFill });
                startTimer();
            });

            var resetButtonRect = svg.rect(posX + 220, posY, 100, 30).attr({ stroke: '#000000', strokeWidth: 2, fill: buttonFill });
            var resetButtonText = svg.text(posX + 235, posY + 22, 'Сброс').attr({ fontSize: 25 });
            var resetButton = svg.group(resetButtonRect, resetButtonText).attr({ cursor: 'pointer' });
            resetButton.mousedown(function () {
                resetButtonRect.attr({ fill: buttonPushedFill });
            }).click(function () {
                resetButtonRect.attr({ fill: buttonFill });
                stopTimer();
                timerTime = 0;
                timerText.attr({ text: timerTime.toFixed((2)) });
                $scope.$emit('timerReset');
            });

            self.value = function () {
                return timerTime;
            }

            function startTimer() {
                stopTimer();
                timerTime = 0;
                self.timerHandlerId = setInterval(function () {
                    timerTime += 0.01;
                    timerText.attr({ text: timerTime.toFixed((2)) });
                }, 9);
                $scope.$emit('timerStart');
            }

            function stopTimer() {
                if (self.timerHandlerId) {
                    clearInterval(self.timerHandlerId);
                    self.timerHandlerId = null;
                    $scope.$emit('timerStop');
                }
            };
        };

        function InteractiveStand() {
            var self = this;
            var height = cnst.lineMax;


            var lineStyle = { stroke: '#000000', strokeWidth: 2 };
            svg.line(cnst.axisX, cnst.axisStart, 125, cnst.axisStart).attr(lineStyle);
            svg.circle(cnst.axisX, cnst.axisStart, 3);

            var lineH = svg.line(125, cnst.axisStart, 125, heightPx()).attr(lineStyle);
            var lineW = svg.line(cnst.axisX, heightPx(), 125, heightPx()).attr(lineStyle);
            var circeW = svg.circle(cnst.axisX, heightPx(), 3);

            var blockY0 = heightPx();
            var blockC1 = svg.circle(cnst.axisX, blockY0, 15).attr({fill: 'rgb(0, 128,192)', stroke: '#000', strokeWidth:2});
            var blockC2 = svg.circle(cnst.axisX, blockY0, 3);
            var blockCl1 = svg.line(cnst.axisX, blockY0, cnst.axisX + 15, blockY0).attr(lineStyle);
            var blockCl2 = svg.line(cnst.axisX, blockY0, cnst.axisX - 15, blockY0).attr(lineStyle);
            var blockCl3 = svg.line(cnst.axisX, blockY0, cnst.axisX, blockY0 + 15).attr(lineStyle);
            var blockCl4 = svg.line(cnst.axisX, blockY0, cnst.axisX, blockY0 - 15).attr(lineStyle);

            var block = svg.group(blockC1, blockC2, blockCl1, blockCl2, blockCl3, blockCl4);
            var blockLine = svg.line(cnst.axisX, blockY0, cnst.axisX, 10).attr(lineStyle);

            self.setLineHeight = function (val) {
                val = val || 0;
                val = Math.max(val, cnst.lineMin);
                val = Math.min(val, cnst.lineMax);
                height = val;
                circeW.attr({ cy: heightPx() })
                lineW.attr({ y1: heightPx(), y2: heightPx() });
                lineH.attr({ y2: heightPx() });

                
                self.setBlockPosition(0, 0);
            }

            self.getLineHeight = function () {
                return height;
            }

            self.setBlockPosition = function(pos, rot) {
                let p = pos;
                blockLine.attr({y1: heightPx() + p});
                var matrix = new Snap.Matrix(1, 0, 0, 1, 0, heightPx() + p - blockY0);
                matrix.rotate(rot, cnst.axisX, blockY0);
                block.attr({transform: matrix});
            };

            self.maxPos = function() {
                return 
            };

            function heightPx() {
                return cnst.axisStart - height * cnst.cmSize;
            }
        }


        function Simulator() {
            var self = this;
            self.simulationHandlerId = null;
            $scope.$on('timerStart', startSimulation);
            $scope.$on('timerReset', stopSimulation);


            function startSimulation() {
                stopSimulation();
                if (!$scope.timer)
                    return;

                var t = 0;
                var disc = cnst.disc;
                var maxDist = $scope.stand.getLineHeight() / 100;
                var m = disc.m;
                var r = disc.r;
                var I = disc.I;
                var T = m * cnst.g / (2 + 2 * (m * r * r / I));
                var B = 2 * r * T / I;
                var a = B * r;
                var V = 0;
                var goUp = false;
                var minS = 0;
                var S = 0;
                var rot = 0;

                a = 1;
                self.simulationHandlerId = setInterval(function () {
                    var dt = 0.01
                    t += dt;
                    var dV = a * dt;
                    if (goUp) {
                        V -= dV;
                    } else {
                        V += dV;
                    }

                    if (V < 0) {
                        minS = S;
                        goUp = false;
                        V = 0;
                        return;
                    }

                    var dS = V * dt;
                    var dRot = dS / disc.r;
                    rot += dRot;

                    if (goUp) {
                        S -= dS;
                    } else {
                        S += dS;
                    }
                    
                    if (S < minS) {
                        S = minS;
                        V = 0;
                        goUp = false;
                    } else if (S > maxDist) {
                        S = maxDist;
                        goUp = true;
                        V = V * 0.99;
                        $scope.timer.stop();
                    }

                    $scope.stand.setBlockPosition(toPixel(S), toDeg(rot));
                }, 9);
            }


            function stopSimulation() {
                if (self.simulationHandlerId) {
                    clearInterval(self.simulationHandlerId);
                    self.simulationHandlerId = null;
                }

                rot = 0;
                V = 0;
                S = 0;
                t = 0;
                $scope.stand.setBlockPosition(toPixel(S), toDeg(rot));
            }

            function toPixel(m){
                return m*100*cnst.cmSize;
            }

            function fromPixel(p) {
                return p / (100 * cnst.cmSize);
            }

            function toDeg(a) {
                return 180 * a / Math.PI;
            }
        }

    }]);