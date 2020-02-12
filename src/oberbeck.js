
angular.module('oberbeckPendulum',[])
.factory('svg', ['$window', function($window){
        var svg = new Snap("#svg-paper");
        svg.domEl = $window.document.getElementById("svg-paper");
        svg.cY = function(y){
            return y - this.domEl.getBoundingClientRect().top;
        };
        svg.cX = function(x){
            return x - this.domEl.getBoundingClientRect().left;
        };
        return svg;
}])
.controller('oberbeckPendulumController', ['$scope', 'svg', function($scope, svg){
        var cnst = {
            cmSize: 5,
            block:{
                center:{x: 60, y: 40},
                rad: 15
            },
            rotator: {
                center: {x: 260, y: 260},
                rad: 15,
                rodLen: 150,
                rodInertion: (1/3) * 0.5 * (0.33*0.33)
            },
            systemPlummetWeight:0.5,
            smallPlummetWeight:0.1,
            bigPlummetWeight:0.2,
            g: 9.8
        }


        drawStaticContent();

        $scope.blockSystem = new BlockSystem(80, 580, cnst.block.center.y, cnst.block.center.x- cnst.block.rad,  cnst.rotator);

        var smallPlummets = new Plummets(4, 330, 553, 0);

        var bigPlummets = new Plummets(4, 470, 553, 1);

        $scope.timer = new Timer(130, 565);

        $scope.simulator = new Simulator();

        function drawStaticContent(){
            drawRuler();
            drawBlock();
            drawRotator();
            drawStand();


            function drawRuler(){
                var cmLen = cnst.cmSize;
                var start = 630;
                var smallLineAttr = {stroke: '#000000', strokeWidth: 1, transform: 't 0.5 0.5'};
                var lineLen = 10;
                for(var i = 0; i<=100;i++){
                    if(i%10 === 0){
                        lineLen = 35;
                    }else if(i%5 === 0){
                        lineLen = 15;
                    }else{
                        lineLen = 10;
                    }
                    svg.line(40, start - i*cmLen,40 - lineLen, start - i*cmLen).attr(smallLineAttr);
                }

                for(i = 0; i<=100;i+=10){
                    svg.text(1, start - i*cmLen -1 , i.toString());
                }
                svg.text(5, start + 10, 'см');
            };

            function drawBlock(){
                var hight = 10;
                var lineStyle = {stroke:'#000000', strokeWidth: 2};
                svg.line(0, hight, 400, hight).attr(lineStyle);
                var path = '';
                for(var i = 0; i<= 400; i+=20)
                {
                    path += ('M' + i +' 10'+ ' L'+(i-10) + ' 0 ');
                }
                svg.path(path).attr(lineStyle);

                svg.circle(cnst.block.center.x, cnst.block.center.y, cnst.block.rad).attr({fill: 'rgb(0, 128,192)', stroke: '#000', strokeWidth:2});
                svg.circle(cnst.block.center.x, cnst.block.center.y, 3);
                svg.line(cnst.block.center.x, cnst.block.center.y, cnst.block.center.x, hight).attr(lineStyle);

            };

            function drawStand(){
                var bottom = 640;
                var fillStyle = svg.gradient('l(0,0,0,1)rgb(9, 175, 255)-rgb(0, 100, 255)')
                var standAttr = {fill: fillStyle , stroke: '#000000', strokeWidth: 1};
                var weights = svg.rect(25, bottom - 10, 100, 10).attr(standAttr);
                var timerBlock = svg.rect(125, bottom - 80, 370, 80).attr(standAttr);

                svg.group(weights, timerBlock).transform('t 0.5, 0.5');
            };

            function drawRotator() {
                var hight = 10;
                var lineStyle = {stroke:'#000000', strokeWidth: 2};
                var smallLineStyle = {stroke:'#000000', strokeWidth: 1};
 
                //rotator block
                svg.circle(cnst.rotator.center.x, cnst.rotator.center.y, cnst.rotator.rad).attr({fill: 'rgb(0, 128,192)', stroke: '#000', strokeWidth:2});
                svg.circle(cnst.rotator.center.x, cnst.rotator.center.y, 3);
                svg.line(cnst.rotator.center.x, cnst.rotator.center.y, cnst.rotator.center.x, hight).attr(lineStyle);

                //rotator connection thread
                var distance = Math.sqrt(Math.pow(cnst.rotator.center.x - cnst.block.center.x, 2) + Math.pow(cnst.rotator.center.y - cnst.block.center.y, 2));
                var dx = cnst.rotator.rad * (cnst.rotator.center.x - cnst.block.center.x) / distance; 
                var dy = -cnst.rotator.rad * (cnst.rotator.center.y - cnst.block.center.y) / distance; 
                svg.line(cnst.rotator.center.x + dx, cnst.rotator.center.y + dy, cnst.block.center.x + dx, cnst.block.center.y + dy).attr(smallLineStyle);
            }
        };

        function BlockSystem(minLen, maxLen, height, leftX, rotator){
            var self = this;
            self.getSystemY = getSystemY;
            self.setSystemY = setSystemY;
            self.getWeight = getWeight;
            self.getRodsPlummets = getRodsPlummets;
            self.minY = height + minLen;
            self.maxY = height + maxLen;

            var weightAttr = {fill: svg.gradient('l(0,0,1,0)#000-#555:40-#000')};
            var threadAttr = {stroke: '#000', strokeWidth: 1};
            var rodAttr = {stroke: '#222', strokeWidth: 3};

            var systemWeight = svg.rect(leftX -10, height +  minLen, 20,10).attr(weightAttr).drag(dragSystem, beginDragSystem);
            var leftThread = svg.line(leftX, height, leftX, height +  minLen).attr(threadAttr);
            var systemYmin = height + minLen; 
            var systemY = systemYmin;

            var threadPlummets = [];
            var rods = [];
            var rodsPlummets = [];
            var pushAreas = getPushAreas();

            for(var i = 0; i < 4; i++) {
                var rod = svg.line(rotator.center.x, rotator.center.y + rotator.rad, rotator.center.x, rotator.center.y + rotator.rad + rotator.rodLen).attr(rodAttr);
                rods.push(rod);
            }

            function getPushAreas() {
                var result = [];
                result.push(getPushArea(rotator.center.x, rotator.center.y + rotator.rad, 0));
                result.push(getPushArea(rotator.center.x, rotator.center.y + rotator.rad + (rotator.rodLen / 2), 0));
                result.push(getPushArea(rotator.center.x, rotator.center.y + rotator.rad + rotator.rodLen, 0));

                result.push(getPushArea(rotator.center.x + rotator.rad, rotator.center.y, 90));
                result.push(getPushArea(rotator.center.x + rotator.rad + (rotator.rodLen / 2), rotator.center.y, 90));
                result.push(getPushArea(rotator.center.x + rotator.rad + rotator.rodLen, rotator.center.y, 90));

                result.push(getPushArea(rotator.center.x, rotator.center.y - rotator.rad - rotator.rodLen, 0));
                result.push(getPushArea(rotator.center.x, rotator.center.y - rotator.rad - (rotator.rodLen / 2), 0));
                result.push(getPushArea(rotator.center.x, rotator.center.y - rotator.rad, 0));

                result.push(getPushArea(rotator.center.x - rotator.rad - rotator.rodLen, rotator.center.y, 90));
                result.push(getPushArea(rotator.center.x - rotator.rad - (rotator.rodLen / 2), rotator.center.y, 90));
                result.push(getPushArea(rotator.center.x - rotator.rad, rotator.center.y, 90));

                return result;
            }

            function getPushArea(x, y, a) {
                var d = 10;
                return {
                    area: {
                        x: x - d,
                        y: y - d,
                        width: 2*d,
                        height: 2*d
                    },
                    position: {
                        x: x,
                        y: y,
                        a: a
                    }
                }
            }

            setRotatorAngle(0);

            function setRotatorAngle(angle) {
                rotatorAngle = angle;
                for (var i = 0; i < rods.length; i++) {
                    var matrix = new Snap.Matrix(1, 0, 0, 1, 0, 0);
                    matrix.rotate(90 * i + angle, rotator.center.x, rotator.center.y);
                    rods[i].attr({transform: matrix});
                }

                for (var i = 0; i < rodsPlummets.length; i++) {
                    var plummet = rodsPlummets[i].plummet;
                    var position = rodsPlummets[i].position;
                    plummet.attr({x: position.x - 7, y: position.y - 3});
                    var matrix = new Snap.Matrix(1, 0, 0, 1, 0, 0);
                    matrix.rotate(angle, rotator.center.x, rotator.center.y);
                    matrix.rotate(position.a, position.x, position.y);
                    plummet.attr({transform: matrix});
                }
            }

            function beginDragSystem(){
                if($scope.timer){
                    $scope.timer.stop();
                }
            };

            function dragSystem(dx, dy, x, y){
                y = svg.cY(y) - 1;

                if(y < self.minY){
                    y = self.minY;
                }else if(y > self.maxY){
                    y = self.maxY;
                }

                setSystemY(y);
            };


            function getSystemY(){
                return systemY;
            };

            function getWeight() {
                var plummetWeight = threadPlummets.reduce(function(sum, plummet){
                    return sum + plummet.weight;
                }, 0);

                return cnst.systemPlummetWeight + plummetWeight;
            };

            function getRodsPlummets() {
                return rodsPlummets;
            };

            function setSystemY(y){
                systemY = y;
                leftThread.attr({y2 : y});

                systemWeight.attr({y : y});
                for(var i=0;i < threadPlummets.length;i++){
                    threadPlummets[i].attr({y: systemY - (i+1)*8});
                }

                var rotatorAngle = -180 * ((systemY - systemYmin) / rotator.rad) / Math.PI;
                setRotatorAngle(rotatorAngle);
            };

            $scope.$on('plummetBeginDrag', function(event, plummet){
                if (threadPlummets.indexOf(plummet) > -1) {
                    threadPlummets.splice(threadPlummets.indexOf(plummet), 1);
                    var y = systemWeight.node.y.baseVal.value;
                    for (var i=0;i < threadPlummets.length;i++){
                        threadPlummets[i].attr({y: y - (i+1)*8});
                    }
                    return;
                }

                for (var i = 0; i < rodsPlummets.length; i++) {
                    if (rodsPlummets[i].plummet === plummet) {
                        rodsPlummets.splice(i, 1);
                    }
                }
            });

            $scope.$on('plummetEndDrag', function(event, plummet){
                if (tryPutOnThread(plummet)) {
                    return;
                } else if (tryPutOnRods(plummet)) {
                    return;
                } else {
                    plummet.attr({x: plummet.home.x, y: plummet.home.y});
                }
            });


            function tryPutOnThread(plummet) {
                var x = plummet.node.x.baseVal.value;
                var y = plummet.node.y.baseVal.value;
                var weightX = systemWeight.node.x.baseVal.value;
                var weightY = systemWeight.node.y.baseVal.value;
                if (Math.abs(x - weightX) < 20 && Math.abs(y - weightY) < 20) {
                    threadPlummets.push(plummet);
                    plummet.attr({x : leftX - 7, y: (weightY - threadPlummets.length * 8)});
                    return true
                 }  else {
                    return false;
                }
            };

            function tryPutOnRods(plummet) {
                var rx = plummet.node.x.baseVal.value + 7 - rotator.center.x;
                var ry = plummet.node.y.baseVal.value + 3 - rotator.center.y;
                var a = Math.PI * rotatorAngle / 180;
                var x = rx * Math.cos(a) + ry * Math.sin(a) + rotator.center.x;
                var y = ry * Math.cos(a) - rx * Math.sin(a) + rotator.center.y;
                for (var i = 0; i< pushAreas.length; i++) {
                    if (isPointInRect(x, y, pushAreas[i].area)) {
                        rodsPlummets.push({plummet: plummet, position: pushAreas[i].position})
                        setRotatorAngle(rotatorAngle);
                        return true;
                    }
                }
                return false;
            }

            function isPointInRect(x, y, rect) {
                return (x > rect.x) && (y > rect.y) && (x < rect.x + rect.width) && (y < rect.y + rect.height);

            }
        };

        function Plummets(count, posX, posY, type){
            var plummetAttr = type === 0 ? 
                {fill: svg.gradient('l(0,0,1,0)#777-#aaa:30-#777')} : {fill: svg.gradient('l(0,0,1,0)#000-#555:30-#000')};

            var offset = 20;
            for(var i=0;i < count;i++){
                var plummet =svg.rect(posX - i*offset, posY, 15, 7).attr(plummetAttr).drag(onDrag, onBeginDrag, onEndDrag);
                plummet.num = i;
                plummet.home = {x: posX - i*offset, y: posY};
                plummet.weight = type === 0 ? cnst.smallPlummetWeight : cnst.bigPlummetWeight;
                this[i.toString()] = plummet;
            }
            this.length = count;

            function onDrag(dx, dy, x, y){
                this.attr({x: svg.cX(x) - 7, y: svg.cY(y) - 4, transform: ''});
            }

            function onBeginDrag(){
                $scope.$emit('plummetBeginDrag', this);
                if( $scope.timer){
                    $scope.timer.stop();
                }
            }

            function onEndDrag(){
                this.attr({transform: ''});
                $scope.$emit('plummetEndDrag', this);
            }
        };


        function Timer(posX, posY){
            var self = this;
            self.start = startTimer;
            self.stop = stopTimer;

            var dispaly = svg.rect(posX, posY, 100, 30).attr({fill: '#00f', stroke: '#000000', strokeWidth: 2});
            var timerText = svg.text(posX+5, posY+ 25, '0.00').attr({fontSize: 30, fill: '#fff'});
            var timerTime = 0;

            var buttonFill  = svg.gradient('l(0,0,0,1)rgb(200, 200, 200)-rgb(100, 100, 100)');
            var buttonPushedFill = svg.gradient('l(0,0,0,1)rgb(100, 100, 100)-rgb(200, 200, 200)');
            var startButtonRect = svg.rect(posX + 110, posY, 100, 30).attr({ stroke: '#000000', strokeWidth: 2, fill: buttonFill});
            var startButtonText  = svg.text(posX + 125, posY + 22, 'Старт').attr({fontSize: 25});
            var startButton = svg.group(startButtonRect, startButtonText).attr({cursor: 'pointer'});
            startButton.mousedown(function(){
                startButtonRect.attr({fill: buttonPushedFill});
            }).click(function(){
                startButtonRect.attr({fill: buttonFill});
                startTimer();
            });



            function startTimer(){
                stopTimer();
                timerTime = 0;
                self.timerHandlerId= setInterval(function(){
                    timerTime += 0.01;
                    timerText.attr({text: timerTime.toFixed((2))});
                },9);
                $scope.$emit('timerStart');
            }

            function stopTimer(){
                if(self.timerHandlerId){
                    clearInterval(self.timerHandlerId);
                    self.timerHandlerId = null;
                    $scope.$emit('timerStop');
                }
            };
        };


        function Simulator(){
            var self = this;
            self.simulationHandlerId = null;
            $scope.$on('timerStart', startSimulation);
            $scope.$on('timerStop', stopSimulation);


            function startSimulation(){
                stopSimulation();
                if(!$scope.blockSystem || !$scope.timer)
                    return;

                var R = fromPixel(cnst.rotator.rad);
                var m = $scope.blockSystem.getWeight();
                var J = 4 * cnst.rotator.rodInertion;
                var rodsPlummets = $scope.blockSystem.getRodsPlummets();
                for (var i = 0; i < rodsPlummets.length; i++) {
                    var l = fromPixel(lenFromCenter(rodsPlummets[i].position));
                    J += (rodsPlummets[i].plummet.weight * l * l);
                }

                var a = cnst.g / (1 + (J / (m * R * R)));
                var a_error = normalDistr(0, a / 100);
                a += a_error;
                var t = 0;
                var y = 0;
                var startY = $scope.blockSystem.getSystemY();

                self.simulationHandlerId = setInterval(function(){
                    t += 0.01;
                    var d = 0.5*a*t*t;
                    y = startY + toPixel(d);
                    if(y < $scope.blockSystem.minY){
                        y = $scope.blockSystem.minY;
                        $scope.timer.stop();
                    }else if(y > $scope.blockSystem.maxY){
                        y = $scope.blockSystem.maxY;
                        $scope.timer.stop();
                    }

                    $scope.blockSystem.setSystemY(y);
                },9);
            }
            

            function stopSimulation(){
                if(self.simulationHandlerId){
                    clearInterval(self.simulationHandlerId);
                    self.simulationHandlerId = null;
                }
            }

            function lenFromCenter(pos) {
                return Math.sqrt(Math.pow(pos.x - cnst.rotator.center.x, 2) + Math.pow(pos.y - cnst.rotator.center.y, 2));
            }

            function toPixel(m){
                return m*100*cnst.cmSize;
            }

            function fromPixel(p) {
                return p / (100 * cnst.cmSize);
            }

            function normalDistr(m, s) {
                return m + s * (Math.sqrt(-2 * Math.log(Math.random())) * Math.sin(2 * Math.PI * Math.random()));
            }
        };

}]);