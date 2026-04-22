/*
   Licensed to the Apache Software Foundation (ASF) under one or more
   contributor license agreements.  See the NOTICE file distributed with
   this work for additional information regarding copyright ownership.
   The ASF licenses this file to You under the Apache License, Version 2.0
   (the "License"); you may not use this file except in compliance with
   the License.  You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
$(document).ready(function() {

    $(".click-title").mouseenter( function(    e){
        e.preventDefault();
        this.style.cursor="pointer";
    });
    $(".click-title").mousedown( function(event){
        event.preventDefault();
    });

    // Ugly code while this script is shared among several pages
    try{
        refreshHitsPerSecond(true);
    } catch(e){}
    try{
        refreshResponseTimeOverTime(true);
    } catch(e){}
    try{
        refreshResponseTimePercentiles();
    } catch(e){}
});


var responseTimePercentilesInfos = {
        data: {"result": {"minY": 1411.0, "minX": 0.0, "maxY": 2928.0, "series": [{"data": [[0.0, 1411.0], [0.1, 1411.0], [0.2, 1411.0], [0.3, 1411.0], [0.4, 1411.0], [0.5, 1411.0], [0.6, 1411.0], [0.7, 1411.0], [0.8, 1412.0], [0.9, 1412.0], [1.0, 1412.0], [1.1, 1412.0], [1.2, 1412.0], [1.3, 1412.0], [1.4, 1412.0], [1.5, 1412.0], [1.6, 1412.0], [1.7, 1412.0], [1.8, 1412.0], [1.9, 1412.0], [2.0, 1412.0], [2.1, 1412.0], [2.2, 1412.0], [2.3, 1412.0], [2.4, 1425.0], [2.5, 1425.0], [2.6, 1425.0], [2.7, 1425.0], [2.8, 1425.0], [2.9, 1425.0], [3.0, 1425.0], [3.1, 1425.0], [3.2, 1438.0], [3.3, 1438.0], [3.4, 1438.0], [3.5, 1438.0], [3.6, 1438.0], [3.7, 1438.0], [3.8, 1438.0], [3.9, 1438.0], [4.0, 1439.0], [4.1, 1439.0], [4.2, 1439.0], [4.3, 1439.0], [4.4, 1439.0], [4.5, 1439.0], [4.6, 1439.0], [4.7, 1439.0], [4.8, 1442.0], [4.9, 1442.0], [5.0, 1442.0], [5.1, 1442.0], [5.2, 1442.0], [5.3, 1442.0], [5.4, 1442.0], [5.5, 1442.0], [5.6, 1446.0], [5.7, 1446.0], [5.8, 1446.0], [5.9, 1446.0], [6.0, 1446.0], [6.1, 1446.0], [6.2, 1446.0], [6.3, 1450.0], [6.4, 1450.0], [6.5, 1450.0], [6.6, 1450.0], [6.7, 1450.0], [6.8, 1450.0], [6.9, 1450.0], [7.0, 1450.0], [7.1, 1450.0], [7.2, 1450.0], [7.3, 1450.0], [7.4, 1450.0], [7.5, 1450.0], [7.6, 1450.0], [7.7, 1450.0], [7.8, 1450.0], [7.9, 1450.0], [8.0, 1450.0], [8.1, 1450.0], [8.2, 1450.0], [8.3, 1450.0], [8.4, 1450.0], [8.5, 1450.0], [8.6, 1450.0], [8.7, 1450.0], [8.8, 1450.0], [8.9, 1450.0], [9.0, 1450.0], [9.1, 1450.0], [9.2, 1450.0], [9.3, 1450.0], [9.4, 1450.0], [9.5, 1458.0], [9.6, 1458.0], [9.7, 1458.0], [9.8, 1458.0], [9.9, 1458.0], [10.0, 1458.0], [10.1, 1458.0], [10.2, 1458.0], [10.3, 1459.0], [10.4, 1459.0], [10.5, 1459.0], [10.6, 1459.0], [10.7, 1459.0], [10.8, 1459.0], [10.9, 1459.0], [11.0, 1459.0], [11.1, 1460.0], [11.2, 1460.0], [11.3, 1460.0], [11.4, 1460.0], [11.5, 1460.0], [11.6, 1460.0], [11.7, 1460.0], [11.8, 1460.0], [11.9, 1462.0], [12.0, 1462.0], [12.1, 1462.0], [12.2, 1462.0], [12.3, 1462.0], [12.4, 1462.0], [12.5, 1462.0], [12.6, 1470.0], [12.7, 1470.0], [12.8, 1470.0], [12.9, 1470.0], [13.0, 1470.0], [13.1, 1470.0], [13.2, 1470.0], [13.3, 1470.0], [13.4, 1470.0], [13.5, 1470.0], [13.6, 1470.0], [13.7, 1470.0], [13.8, 1470.0], [13.9, 1470.0], [14.0, 1470.0], [14.1, 1470.0], [14.2, 1473.0], [14.3, 1473.0], [14.4, 1473.0], [14.5, 1473.0], [14.6, 1473.0], [14.7, 1473.0], [14.8, 1473.0], [14.9, 1473.0], [15.0, 1473.0], [15.1, 1473.0], [15.2, 1473.0], [15.3, 1473.0], [15.4, 1473.0], [15.5, 1473.0], [15.6, 1473.0], [15.7, 1473.0], [15.8, 1473.0], [15.9, 1473.0], [16.0, 1473.0], [16.1, 1473.0], [16.2, 1473.0], [16.3, 1473.0], [16.4, 1473.0], [16.5, 1473.0], [16.6, 1475.0], [16.7, 1475.0], [16.8, 1475.0], [16.9, 1475.0], [17.0, 1475.0], [17.1, 1475.0], [17.2, 1475.0], [17.3, 1475.0], [17.4, 1476.0], [17.5, 1476.0], [17.6, 1476.0], [17.7, 1476.0], [17.8, 1476.0], [17.9, 1476.0], [18.0, 1476.0], [18.1, 1476.0], [18.2, 1481.0], [18.3, 1481.0], [18.4, 1481.0], [18.5, 1481.0], [18.6, 1481.0], [18.7, 1481.0], [18.8, 1481.0], [18.9, 1481.0], [19.0, 1481.0], [19.1, 1481.0], [19.2, 1481.0], [19.3, 1481.0], [19.4, 1481.0], [19.5, 1481.0], [19.6, 1481.0], [19.7, 1482.0], [19.8, 1482.0], [19.9, 1482.0], [20.0, 1482.0], [20.1, 1482.0], [20.2, 1482.0], [20.3, 1482.0], [20.4, 1482.0], [20.5, 1482.0], [20.6, 1482.0], [20.7, 1482.0], [20.8, 1482.0], [20.9, 1482.0], [21.0, 1482.0], [21.1, 1482.0], [21.2, 1482.0], [21.3, 1483.0], [21.4, 1483.0], [21.5, 1483.0], [21.6, 1483.0], [21.7, 1483.0], [21.8, 1483.0], [21.9, 1483.0], [22.0, 1483.0], [22.1, 1485.0], [22.2, 1485.0], [22.3, 1485.0], [22.4, 1485.0], [22.5, 1485.0], [22.6, 1485.0], [22.7, 1485.0], [22.8, 1485.0], [22.9, 1492.0], [23.0, 1492.0], [23.1, 1492.0], [23.2, 1492.0], [23.3, 1492.0], [23.4, 1492.0], [23.5, 1492.0], [23.6, 1492.0], [23.7, 1492.0], [23.8, 1492.0], [23.9, 1492.0], [24.0, 1492.0], [24.1, 1492.0], [24.2, 1492.0], [24.3, 1492.0], [24.4, 1492.0], [24.5, 1499.0], [24.6, 1499.0], [24.7, 1499.0], [24.8, 1499.0], [24.9, 1499.0], [25.0, 1499.0], [25.1, 1499.0], [25.2, 1501.0], [25.3, 1501.0], [25.4, 1501.0], [25.5, 1501.0], [25.6, 1501.0], [25.7, 1501.0], [25.8, 1501.0], [25.9, 1501.0], [26.0, 1501.0], [26.1, 1501.0], [26.2, 1501.0], [26.3, 1501.0], [26.4, 1501.0], [26.5, 1501.0], [26.6, 1501.0], [26.7, 1501.0], [26.8, 1502.0], [26.9, 1502.0], [27.0, 1502.0], [27.1, 1502.0], [27.2, 1502.0], [27.3, 1502.0], [27.4, 1502.0], [27.5, 1502.0], [27.6, 1503.0], [27.7, 1503.0], [27.8, 1503.0], [27.9, 1503.0], [28.0, 1503.0], [28.1, 1503.0], [28.2, 1503.0], [28.3, 1503.0], [28.4, 1503.0], [28.5, 1503.0], [28.6, 1503.0], [28.7, 1503.0], [28.8, 1503.0], [28.9, 1503.0], [29.0, 1503.0], [29.1, 1503.0], [29.2, 1503.0], [29.3, 1503.0], [29.4, 1503.0], [29.5, 1503.0], [29.6, 1503.0], [29.7, 1503.0], [29.8, 1503.0], [29.9, 1503.0], [30.0, 1504.0], [30.1, 1504.0], [30.2, 1504.0], [30.3, 1504.0], [30.4, 1504.0], [30.5, 1504.0], [30.6, 1504.0], [30.7, 1504.0], [30.8, 1506.0], [30.9, 1506.0], [31.0, 1506.0], [31.1, 1506.0], [31.2, 1506.0], [31.3, 1506.0], [31.4, 1506.0], [31.5, 1508.0], [31.6, 1508.0], [31.7, 1508.0], [31.8, 1508.0], [31.9, 1508.0], [32.0, 1508.0], [32.1, 1508.0], [32.2, 1508.0], [32.3, 1512.0], [32.4, 1512.0], [32.5, 1512.0], [32.6, 1512.0], [32.7, 1512.0], [32.8, 1512.0], [32.9, 1512.0], [33.0, 1512.0], [33.1, 1512.0], [33.2, 1512.0], [33.3, 1512.0], [33.4, 1512.0], [33.5, 1512.0], [33.6, 1512.0], [33.7, 1512.0], [33.8, 1512.0], [33.9, 1516.0], [34.0, 1516.0], [34.1, 1516.0], [34.2, 1516.0], [34.3, 1516.0], [34.4, 1516.0], [34.5, 1516.0], [34.6, 1516.0], [34.7, 1520.0], [34.8, 1520.0], [34.9, 1520.0], [35.0, 1520.0], [35.1, 1520.0], [35.2, 1520.0], [35.3, 1520.0], [35.4, 1520.0], [35.5, 1520.0], [35.6, 1520.0], [35.7, 1520.0], [35.8, 1520.0], [35.9, 1520.0], [36.0, 1520.0], [36.1, 1520.0], [36.2, 1520.0], [36.3, 1521.0], [36.4, 1521.0], [36.5, 1521.0], [36.6, 1521.0], [36.7, 1521.0], [36.8, 1521.0], [36.9, 1521.0], [37.0, 1521.0], [37.1, 1522.0], [37.2, 1522.0], [37.3, 1522.0], [37.4, 1522.0], [37.5, 1522.0], [37.6, 1522.0], [37.7, 1522.0], [37.8, 1527.0], [37.9, 1527.0], [38.0, 1527.0], [38.1, 1527.0], [38.2, 1527.0], [38.3, 1527.0], [38.4, 1527.0], [38.5, 1527.0], [38.6, 1530.0], [38.7, 1530.0], [38.8, 1530.0], [38.9, 1530.0], [39.0, 1530.0], [39.1, 1530.0], [39.2, 1530.0], [39.3, 1530.0], [39.4, 1531.0], [39.5, 1531.0], [39.6, 1531.0], [39.7, 1531.0], [39.8, 1531.0], [39.9, 1531.0], [40.0, 1531.0], [40.1, 1531.0], [40.2, 1534.0], [40.3, 1534.0], [40.4, 1534.0], [40.5, 1534.0], [40.6, 1534.0], [40.7, 1534.0], [40.8, 1534.0], [40.9, 1534.0], [41.0, 1535.0], [41.1, 1535.0], [41.2, 1535.0], [41.3, 1535.0], [41.4, 1535.0], [41.5, 1535.0], [41.6, 1535.0], [41.7, 1535.0], [41.8, 1536.0], [41.9, 1536.0], [42.0, 1536.0], [42.1, 1536.0], [42.2, 1536.0], [42.3, 1536.0], [42.4, 1536.0], [42.5, 1536.0], [42.6, 1536.0], [42.7, 1536.0], [42.8, 1536.0], [42.9, 1536.0], [43.0, 1536.0], [43.1, 1536.0], [43.2, 1536.0], [43.3, 1536.0], [43.4, 1537.0], [43.5, 1537.0], [43.6, 1537.0], [43.7, 1537.0], [43.8, 1537.0], [43.9, 1537.0], [44.0, 1537.0], [44.1, 1537.0], [44.2, 1537.0], [44.3, 1537.0], [44.4, 1537.0], [44.5, 1537.0], [44.6, 1537.0], [44.7, 1537.0], [44.8, 1537.0], [44.9, 1539.0], [45.0, 1539.0], [45.1, 1539.0], [45.2, 1539.0], [45.3, 1539.0], [45.4, 1539.0], [45.5, 1539.0], [45.6, 1539.0], [45.7, 1549.0], [45.8, 1549.0], [45.9, 1549.0], [46.0, 1549.0], [46.1, 1549.0], [46.2, 1549.0], [46.3, 1549.0], [46.4, 1549.0], [46.5, 1552.0], [46.6, 1552.0], [46.7, 1552.0], [46.8, 1552.0], [46.9, 1552.0], [47.0, 1552.0], [47.1, 1552.0], [47.2, 1552.0], [47.3, 1553.0], [47.4, 1553.0], [47.5, 1553.0], [47.6, 1553.0], [47.7, 1553.0], [47.8, 1553.0], [47.9, 1553.0], [48.0, 1553.0], [48.1, 1556.0], [48.2, 1556.0], [48.3, 1556.0], [48.4, 1556.0], [48.5, 1556.0], [48.6, 1556.0], [48.7, 1556.0], [48.8, 1556.0], [48.9, 1559.0], [49.0, 1559.0], [49.1, 1559.0], [49.2, 1559.0], [49.3, 1559.0], [49.4, 1559.0], [49.5, 1559.0], [49.6, 1559.0], [49.7, 1573.0], [49.8, 1573.0], [49.9, 1573.0], [50.0, 1573.0], [50.1, 1573.0], [50.2, 1573.0], [50.3, 1573.0], [50.4, 1574.0], [50.5, 1574.0], [50.6, 1574.0], [50.7, 1574.0], [50.8, 1574.0], [50.9, 1574.0], [51.0, 1574.0], [51.1, 1574.0], [51.2, 1578.0], [51.3, 1578.0], [51.4, 1578.0], [51.5, 1578.0], [51.6, 1578.0], [51.7, 1578.0], [51.8, 1578.0], [51.9, 1578.0], [52.0, 1580.0], [52.1, 1580.0], [52.2, 1580.0], [52.3, 1580.0], [52.4, 1580.0], [52.5, 1580.0], [52.6, 1580.0], [52.7, 1580.0], [52.8, 1583.0], [52.9, 1583.0], [53.0, 1583.0], [53.1, 1583.0], [53.2, 1583.0], [53.3, 1583.0], [53.4, 1583.0], [53.5, 1583.0], [53.6, 1586.0], [53.7, 1586.0], [53.8, 1586.0], [53.9, 1586.0], [54.0, 1586.0], [54.1, 1586.0], [54.2, 1586.0], [54.3, 1586.0], [54.4, 1590.0], [54.5, 1590.0], [54.6, 1590.0], [54.7, 1590.0], [54.8, 1590.0], [54.9, 1590.0], [55.0, 1590.0], [55.1, 1590.0], [55.2, 1592.0], [55.3, 1592.0], [55.4, 1592.0], [55.5, 1592.0], [55.6, 1592.0], [55.7, 1592.0], [55.8, 1592.0], [55.9, 1592.0], [56.0, 1608.0], [56.1, 1608.0], [56.2, 1608.0], [56.3, 1608.0], [56.4, 1608.0], [56.5, 1608.0], [56.6, 1608.0], [56.7, 1611.0], [56.8, 1611.0], [56.9, 1611.0], [57.0, 1611.0], [57.1, 1611.0], [57.2, 1611.0], [57.3, 1611.0], [57.4, 1611.0], [57.5, 1614.0], [57.6, 1614.0], [57.7, 1614.0], [57.8, 1614.0], [57.9, 1614.0], [58.0, 1614.0], [58.1, 1614.0], [58.2, 1614.0], [58.3, 1615.0], [58.4, 1615.0], [58.5, 1615.0], [58.6, 1615.0], [58.7, 1615.0], [58.8, 1615.0], [58.9, 1615.0], [59.0, 1615.0], [59.1, 1615.0], [59.2, 1615.0], [59.3, 1615.0], [59.4, 1615.0], [59.5, 1615.0], [59.6, 1615.0], [59.7, 1615.0], [59.8, 1615.0], [59.9, 1617.0], [60.0, 1617.0], [60.1, 1617.0], [60.2, 1617.0], [60.3, 1617.0], [60.4, 1617.0], [60.5, 1617.0], [60.6, 1617.0], [60.7, 1619.0], [60.8, 1619.0], [60.9, 1619.0], [61.0, 1619.0], [61.1, 1619.0], [61.2, 1619.0], [61.3, 1619.0], [61.4, 1619.0], [61.5, 1624.0], [61.6, 1624.0], [61.7, 1624.0], [61.8, 1624.0], [61.9, 1624.0], [62.0, 1624.0], [62.1, 1624.0], [62.2, 1624.0], [62.3, 1626.0], [62.4, 1626.0], [62.5, 1626.0], [62.6, 1626.0], [62.7, 1626.0], [62.8, 1626.0], [62.9, 1626.0], [63.0, 1630.0], [63.1, 1630.0], [63.2, 1630.0], [63.3, 1630.0], [63.4, 1630.0], [63.5, 1630.0], [63.6, 1630.0], [63.7, 1630.0], [63.8, 1636.0], [63.9, 1636.0], [64.0, 1636.0], [64.1, 1636.0], [64.2, 1636.0], [64.3, 1636.0], [64.4, 1636.0], [64.5, 1636.0], [64.6, 1655.0], [64.7, 1655.0], [64.8, 1655.0], [64.9, 1655.0], [65.0, 1655.0], [65.1, 1655.0], [65.2, 1655.0], [65.3, 1655.0], [65.4, 1662.0], [65.5, 1662.0], [65.6, 1662.0], [65.7, 1662.0], [65.8, 1662.0], [65.9, 1662.0], [66.0, 1662.0], [66.1, 1662.0], [66.2, 1666.0], [66.3, 1666.0], [66.4, 1666.0], [66.5, 1666.0], [66.6, 1666.0], [66.7, 1666.0], [66.8, 1666.0], [66.9, 1666.0], [67.0, 1670.0], [67.1, 1670.0], [67.2, 1670.0], [67.3, 1670.0], [67.4, 1670.0], [67.5, 1670.0], [67.6, 1670.0], [67.7, 1670.0], [67.8, 1680.0], [67.9, 1680.0], [68.0, 1680.0], [68.1, 1680.0], [68.2, 1680.0], [68.3, 1680.0], [68.4, 1680.0], [68.5, 1680.0], [68.6, 1683.0], [68.7, 1683.0], [68.8, 1683.0], [68.9, 1683.0], [69.0, 1683.0], [69.1, 1683.0], [69.2, 1683.0], [69.3, 1713.0], [69.4, 1713.0], [69.5, 1713.0], [69.6, 1713.0], [69.7, 1713.0], [69.8, 1713.0], [69.9, 1713.0], [70.0, 1713.0], [70.1, 1721.0], [70.2, 1721.0], [70.3, 1721.0], [70.4, 1721.0], [70.5, 1721.0], [70.6, 1721.0], [70.7, 1721.0], [70.8, 1721.0], [70.9, 1725.0], [71.0, 1725.0], [71.1, 1725.0], [71.2, 1725.0], [71.3, 1725.0], [71.4, 1725.0], [71.5, 1725.0], [71.6, 1725.0], [71.7, 1729.0], [71.8, 1729.0], [71.9, 1729.0], [72.0, 1729.0], [72.1, 1729.0], [72.2, 1729.0], [72.3, 1729.0], [72.4, 1729.0], [72.5, 1742.0], [72.6, 1742.0], [72.7, 1742.0], [72.8, 1742.0], [72.9, 1742.0], [73.0, 1742.0], [73.1, 1742.0], [73.2, 1742.0], [73.3, 1743.0], [73.4, 1743.0], [73.5, 1743.0], [73.6, 1743.0], [73.7, 1743.0], [73.8, 1743.0], [73.9, 1743.0], [74.0, 1743.0], [74.1, 1759.0], [74.2, 1759.0], [74.3, 1759.0], [74.4, 1759.0], [74.5, 1759.0], [74.6, 1759.0], [74.7, 1759.0], [74.8, 1759.0], [74.9, 1765.0], [75.0, 1765.0], [75.1, 1765.0], [75.2, 1765.0], [75.3, 1765.0], [75.4, 1765.0], [75.5, 1765.0], [75.6, 1791.0], [75.7, 1791.0], [75.8, 1791.0], [75.9, 1791.0], [76.0, 1791.0], [76.1, 1791.0], [76.2, 1791.0], [76.3, 1791.0], [76.4, 1814.0], [76.5, 1814.0], [76.6, 1814.0], [76.7, 1814.0], [76.8, 1814.0], [76.9, 1814.0], [77.0, 1814.0], [77.1, 1814.0], [77.2, 1821.0], [77.3, 1821.0], [77.4, 1821.0], [77.5, 1821.0], [77.6, 1821.0], [77.7, 1821.0], [77.8, 1821.0], [77.9, 1821.0], [78.0, 1822.0], [78.1, 1822.0], [78.2, 1822.0], [78.3, 1822.0], [78.4, 1822.0], [78.5, 1822.0], [78.6, 1822.0], [78.7, 1822.0], [78.8, 1831.0], [78.9, 1831.0], [79.0, 1831.0], [79.1, 1831.0], [79.2, 1831.0], [79.3, 1831.0], [79.4, 1831.0], [79.5, 1831.0], [79.6, 1837.0], [79.7, 1837.0], [79.8, 1837.0], [79.9, 1837.0], [80.0, 1837.0], [80.1, 1837.0], [80.2, 1837.0], [80.3, 1837.0], [80.4, 1843.0], [80.5, 1843.0], [80.6, 1843.0], [80.7, 1843.0], [80.8, 1843.0], [80.9, 1843.0], [81.0, 1843.0], [81.1, 1843.0], [81.2, 1852.0], [81.3, 1852.0], [81.4, 1852.0], [81.5, 1852.0], [81.6, 1852.0], [81.7, 1852.0], [81.8, 1852.0], [81.9, 1852.0], [82.0, 1852.0], [82.1, 1852.0], [82.2, 1852.0], [82.3, 1852.0], [82.4, 1852.0], [82.5, 1852.0], [82.6, 1852.0], [82.7, 1863.0], [82.8, 1863.0], [82.9, 1863.0], [83.0, 1863.0], [83.1, 1863.0], [83.2, 1863.0], [83.3, 1863.0], [83.4, 1863.0], [83.5, 1867.0], [83.6, 1867.0], [83.7, 1867.0], [83.8, 1867.0], [83.9, 1867.0], [84.0, 1867.0], [84.1, 1867.0], [84.2, 1867.0], [84.3, 1880.0], [84.4, 1880.0], [84.5, 1880.0], [84.6, 1880.0], [84.7, 1880.0], [84.8, 1880.0], [84.9, 1880.0], [85.0, 1880.0], [85.1, 1888.0], [85.2, 1888.0], [85.3, 1888.0], [85.4, 1888.0], [85.5, 1888.0], [85.6, 1888.0], [85.7, 1888.0], [85.8, 1888.0], [85.9, 1900.0], [86.0, 1900.0], [86.1, 1900.0], [86.2, 1900.0], [86.3, 1900.0], [86.4, 1900.0], [86.5, 1900.0], [86.6, 1900.0], [86.7, 1902.0], [86.8, 1902.0], [86.9, 1902.0], [87.0, 1902.0], [87.1, 1902.0], [87.2, 1902.0], [87.3, 1902.0], [87.4, 1902.0], [87.5, 1905.0], [87.6, 1905.0], [87.7, 1905.0], [87.8, 1905.0], [87.9, 1905.0], [88.0, 1905.0], [88.1, 1905.0], [88.2, 1910.0], [88.3, 1910.0], [88.4, 1910.0], [88.5, 1910.0], [88.6, 1910.0], [88.7, 1910.0], [88.8, 1910.0], [88.9, 1910.0], [89.0, 1911.0], [89.1, 1911.0], [89.2, 1911.0], [89.3, 1911.0], [89.4, 1911.0], [89.5, 1911.0], [89.6, 1911.0], [89.7, 1911.0], [89.8, 1923.0], [89.9, 1923.0], [90.0, 1923.0], [90.1, 1923.0], [90.2, 1923.0], [90.3, 1923.0], [90.4, 1923.0], [90.5, 1923.0], [90.6, 1937.0], [90.7, 1937.0], [90.8, 1937.0], [90.9, 1937.0], [91.0, 1937.0], [91.1, 1937.0], [91.2, 1937.0], [91.3, 1937.0], [91.4, 2013.0], [91.5, 2013.0], [91.6, 2013.0], [91.7, 2013.0], [91.8, 2013.0], [91.9, 2013.0], [92.0, 2013.0], [92.1, 2013.0], [92.2, 2092.0], [92.3, 2092.0], [92.4, 2092.0], [92.5, 2092.0], [92.6, 2092.0], [92.7, 2092.0], [92.8, 2092.0], [92.9, 2092.0], [93.0, 2114.0], [93.1, 2114.0], [93.2, 2114.0], [93.3, 2114.0], [93.4, 2114.0], [93.5, 2114.0], [93.6, 2114.0], [93.7, 2114.0], [93.8, 2216.0], [93.9, 2216.0], [94.0, 2216.0], [94.1, 2216.0], [94.2, 2216.0], [94.3, 2216.0], [94.4, 2216.0], [94.5, 2330.0], [94.6, 2330.0], [94.7, 2330.0], [94.8, 2330.0], [94.9, 2330.0], [95.0, 2330.0], [95.1, 2330.0], [95.2, 2330.0], [95.3, 2367.0], [95.4, 2367.0], [95.5, 2367.0], [95.6, 2367.0], [95.7, 2367.0], [95.8, 2367.0], [95.9, 2367.0], [96.0, 2367.0], [96.1, 2372.0], [96.2, 2372.0], [96.3, 2372.0], [96.4, 2372.0], [96.5, 2372.0], [96.6, 2372.0], [96.7, 2372.0], [96.8, 2372.0], [96.9, 2437.0], [97.0, 2437.0], [97.1, 2437.0], [97.2, 2437.0], [97.3, 2437.0], [97.4, 2437.0], [97.5, 2437.0], [97.6, 2437.0], [97.7, 2577.0], [97.8, 2577.0], [97.9, 2577.0], [98.0, 2577.0], [98.1, 2577.0], [98.2, 2577.0], [98.3, 2577.0], [98.4, 2577.0], [98.5, 2768.0], [98.6, 2768.0], [98.7, 2768.0], [98.8, 2768.0], [98.9, 2768.0], [99.0, 2768.0], [99.1, 2768.0], [99.2, 2768.0], [99.3, 2928.0], [99.4, 2928.0], [99.5, 2928.0], [99.6, 2928.0], [99.7, 2928.0], [99.8, 2928.0], [99.9, 2928.0], [100.0, 2928.0]], "isOverall": false, "label": "ffmpeg-0 (Split Audio/Video)", "isController": false}], "supportsControllersDiscrimination": true, "maxX": 100.0, "title": "Response Time Percentiles"}},
        getOptions: function() {
            return {
                series: {
                    points: { show: false }
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendResponseTimePercentiles'
                },
                xaxis: {
                    tickDecimals: 1,
                    axisLabel: "Percentiles",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Percentile value in ms",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s : %x.2 percentile was %y ms"
                },
                selection: { mode: "xy" },
            };
        },
        createGraph: function() {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesResponseTimePercentiles"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotResponseTimesPercentiles"), dataset, options);
            // setup overview
            $.plot($("#overviewResponseTimesPercentiles"), dataset, prepareOverviewOptions(options));
        }
};

/**
 * @param elementId Id of element where we display message
 */
function setEmptyGraph(elementId) {
    $(function() {
        $(elementId).text("No graph series with filter="+seriesFilter);
    });
}

// Response times percentiles
function refreshResponseTimePercentiles() {
    var infos = responseTimePercentilesInfos;
    prepareSeries(infos.data);
    if(infos.data.result.series.length == 0) {
        setEmptyGraph("#bodyResponseTimePercentiles");
        return;
    }
    if (isGraph($("#flotResponseTimesPercentiles"))){
        infos.createGraph();
    } else {
        var choiceContainer = $("#choicesResponseTimePercentiles");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotResponseTimesPercentiles", "#overviewResponseTimesPercentiles");
        $('#bodyResponseTimePercentiles .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
}

var responseTimeDistributionInfos = {
        data: {"result": {"minY": 1.0, "minX": 1400.0, "maxY": 39.0, "series": [{"data": [[2100.0, 1.0], [2300.0, 3.0], [2200.0, 1.0], [2400.0, 1.0], [2500.0, 1.0], [2700.0, 1.0], [2900.0, 1.0], [1400.0, 32.0], [1500.0, 39.0], [1600.0, 17.0], [1700.0, 9.0], [1800.0, 12.0], [1900.0, 7.0], [2000.0, 2.0]], "isOverall": false, "label": "ffmpeg-0 (Split Audio/Video)", "isController": false}], "supportsControllersDiscrimination": true, "granularity": 100, "maxX": 2900.0, "title": "Response Time Distribution"}},
        getOptions: function() {
            var granularity = this.data.result.granularity;
            return {
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendResponseTimeDistribution'
                },
                xaxis:{
                    axisLabel: "Response times in ms",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Number of responses",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                bars : {
                    show: true,
                    barWidth: this.data.result.granularity
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: function(label, xval, yval, flotItem){
                        return yval + " responses for " + label + " were between " + xval + " and " + (xval + granularity) + " ms";
                    }
                }
            };
        },
        createGraph: function() {
            var data = this.data;
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotResponseTimeDistribution"), prepareData(data.result.series, $("#choicesResponseTimeDistribution")), options);
        }

};

// Response time distribution
function refreshResponseTimeDistribution() {
    var infos = responseTimeDistributionInfos;
    prepareSeries(infos.data);
    if(infos.data.result.series.length == 0) {
        setEmptyGraph("#bodyResponseTimeDistribution");
        return;
    }
    if (isGraph($("#flotResponseTimeDistribution"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesResponseTimeDistribution");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        $('#footerResponseTimeDistribution .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};


var syntheticResponseTimeDistributionInfos = {
        data: {"result": {"minY": 32.0, "minX": 1.0, "ticks": [[0, "Requests having \nresponse time <= 500ms"], [1, "Requests having \nresponse time > 500ms and <= 1,500ms"], [2, "Requests having \nresponse time > 1,500ms"], [3, "Requests in error"]], "maxY": 95.0, "series": [{"data": [], "color": "#9ACD32", "isOverall": false, "label": "Requests having \nresponse time <= 500ms", "isController": false}, {"data": [[1.0, 32.0]], "color": "yellow", "isOverall": false, "label": "Requests having \nresponse time > 500ms and <= 1,500ms", "isController": false}, {"data": [[2.0, 95.0]], "color": "orange", "isOverall": false, "label": "Requests having \nresponse time > 1,500ms", "isController": false}, {"data": [], "color": "#FF6347", "isOverall": false, "label": "Requests in error", "isController": false}], "supportsControllersDiscrimination": false, "maxX": 2.0, "title": "Synthetic Response Times Distribution"}},
        getOptions: function() {
            return {
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendSyntheticResponseTimeDistribution'
                },
                xaxis:{
                    axisLabel: "Response times ranges",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                    tickLength:0,
                    min:-0.5,
                    max:3.5
                },
                yaxis: {
                    axisLabel: "Number of responses",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                bars : {
                    show: true,
                    align: "center",
                    barWidth: 0.25,
                    fill:.75
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: function(label, xval, yval, flotItem){
                        return yval + " " + label;
                    }
                }
            };
        },
        createGraph: function() {
            var data = this.data;
            var options = this.getOptions();
            prepareOptions(options, data);
            options.xaxis.ticks = data.result.ticks;
            $.plot($("#flotSyntheticResponseTimeDistribution"), prepareData(data.result.series, $("#choicesSyntheticResponseTimeDistribution")), options);
        }

};

// Response time distribution
function refreshSyntheticResponseTimeDistribution() {
    var infos = syntheticResponseTimeDistributionInfos;
    prepareSeries(infos.data, true);
    if (isGraph($("#flotSyntheticResponseTimeDistribution"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesSyntheticResponseTimeDistribution");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        $('#footerSyntheticResponseTimeDistribution .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var activeThreadsOverTimeInfos = {
        data: {"result": {"minY": 6.5, "minX": 1.77635352E12, "maxY": 10.0, "series": [{"data": [[1.77635364E12, 10.0], [1.77635376E12, 6.5], [1.77635358E12, 10.0], [1.7763537E12, 9.678571428571425], [1.77635352E12, 9.875]], "isOverall": false, "label": "Queue Pipeline Trigger - Stage 1 Only", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 60000, "maxX": 1.77635376E12, "title": "Active Threads Over Time"}},
        getOptions: function() {
            return {
                series: {
                    stack: true,
                    lines: {
                        show: true,
                        fill: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: getTimeFormat(this.data.result.granularity),
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Number of active threads",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20
                },
                legend: {
                    noColumns: 6,
                    show: true,
                    container: '#legendActiveThreadsOverTime'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                selection: {
                    mode: 'xy'
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s : At %x there were %y active threads"
                }
            };
        },
        createGraph: function() {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesActiveThreadsOverTime"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotActiveThreadsOverTime"), dataset, options);
            // setup overview
            $.plot($("#overviewActiveThreadsOverTime"), dataset, prepareOverviewOptions(options));
        }
};

// Active Threads Over Time
function refreshActiveThreadsOverTime(fixTimestamps) {
    var infos = activeThreadsOverTimeInfos;
    prepareSeries(infos.data);
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 0);
    }
    if(isGraph($("#flotActiveThreadsOverTime"))) {
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesActiveThreadsOverTime");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotActiveThreadsOverTime", "#overviewActiveThreadsOverTime");
        $('#footerActiveThreadsOverTime .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var timeVsThreadsInfos = {
        data: {"result": {"minY": 1411.5, "minX": 1.0, "maxY": 1707.2631578947367, "series": [{"data": [[8.0, 1555.3571428571431], [4.0, 1666.0], [2.0, 1473.0], [1.0, 1481.0], [9.0, 1595.4444444444443], [10.0, 1707.2631578947367], [5.0, 1624.0], [6.0, 1483.0], [3.0, 1411.5], [7.0, 1544.5]], "isOverall": false, "label": "ffmpeg-0 (Split Audio/Video)", "isController": false}, {"data": [[9.299212598425203, 1669.0]], "isOverall": false, "label": "ffmpeg-0 (Split Audio/Video)-Aggregated", "isController": false}], "supportsControllersDiscrimination": true, "maxX": 10.0, "title": "Time VS Threads"}},
        getOptions: function() {
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    axisLabel: "Number of active threads",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Average response times in ms",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20
                },
                legend: { noColumns: 2,show: true, container: '#legendTimeVsThreads' },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s: At %x.2 active threads, Average response time was %y.2 ms"
                }
            };
        },
        createGraph: function() {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesTimeVsThreads"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotTimesVsThreads"), dataset, options);
            // setup overview
            $.plot($("#overviewTimesVsThreads"), dataset, prepareOverviewOptions(options));
        }
};

// Time vs threads
function refreshTimeVsThreads(){
    var infos = timeVsThreadsInfos;
    prepareSeries(infos.data);
    if(infos.data.result.series.length == 0) {
        setEmptyGraph("#bodyTimeVsThreads");
        return;
    }
    if(isGraph($("#flotTimesVsThreads"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesTimeVsThreads");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotTimesVsThreads", "#overviewTimesVsThreads");
        $('#footerTimeVsThreads .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var bytesThroughputOverTimeInfos = {
        data : {"result": {"minY": 200.56666666666666, "minX": 1.77635352E12, "maxY": 2954.9666666666667, "series": [{"data": [[1.77635364E12, 2445.7166666666667], [1.77635376E12, 2241.9166666666665], [1.77635358E12, 2954.9666666666667], [1.7763537E12, 2853.3166666666666], [1.77635352E12, 2445.5833333333335]], "isOverall": false, "label": "Bytes received per second", "isController": false}, {"data": [[1.77635364E12, 218.8], [1.77635376E12, 200.56666666666666], [1.77635358E12, 264.3833333333333], [1.7763537E12, 255.26666666666668], [1.77635352E12, 218.8]], "isOverall": false, "label": "Bytes sent per second", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 60000, "maxX": 1.77635376E12, "title": "Bytes Throughput Over Time"}},
        getOptions : function(){
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: getTimeFormat(this.data.result.granularity),
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity) ,
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Bytes / sec",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendBytesThroughputOverTime'
                },
                selection: {
                    mode: "xy"
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s at %x was %y"
                }
            };
        },
        createGraph : function() {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesBytesThroughputOverTime"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotBytesThroughputOverTime"), dataset, options);
            // setup overview
            $.plot($("#overviewBytesThroughputOverTime"), dataset, prepareOverviewOptions(options));
        }
};

// Bytes throughput Over Time
function refreshBytesThroughputOverTime(fixTimestamps) {
    var infos = bytesThroughputOverTimeInfos;
    prepareSeries(infos.data);
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 0);
    }
    if(isGraph($("#flotBytesThroughputOverTime"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesBytesThroughputOverTime");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotBytesThroughputOverTime", "#overviewBytesThroughputOverTime");
        $('#footerBytesThroughputOverTime .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
}

var responseTimesOverTimeInfos = {
        data: {"result": {"minY": 1537.7727272727277, "minX": 1.77635352E12, "maxY": 1762.586206896552, "series": [{"data": [[1.77635364E12, 1618.8749999999998], [1.77635376E12, 1537.7727272727277], [1.77635358E12, 1762.586206896552], [1.7763537E12, 1747.3214285714287], [1.77635352E12, 1634.9583333333335]], "isOverall": false, "label": "ffmpeg-0 (Split Audio/Video)", "isController": false}], "supportsControllersDiscrimination": true, "granularity": 60000, "maxX": 1.77635376E12, "title": "Response Time Over Time"}},
        getOptions: function(){
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: getTimeFormat(this.data.result.granularity),
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Average response time in ms",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendResponseTimesOverTime'
                },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s : at %x Average response time was %y ms"
                }
            };
        },
        createGraph: function() {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesResponseTimesOverTime"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotResponseTimesOverTime"), dataset, options);
            // setup overview
            $.plot($("#overviewResponseTimesOverTime"), dataset, prepareOverviewOptions(options));
        }
};

// Response Times Over Time
function refreshResponseTimeOverTime(fixTimestamps) {
    var infos = responseTimesOverTimeInfos;
    prepareSeries(infos.data);
    if(infos.data.result.series.length == 0) {
        setEmptyGraph("#bodyResponseTimeOverTime");
        return;
    }
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 0);
    }
    if(isGraph($("#flotResponseTimesOverTime"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesResponseTimesOverTime");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotResponseTimesOverTime", "#overviewResponseTimesOverTime");
        $('#footerResponseTimesOverTime .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var latenciesOverTimeInfos = {
        data: {"result": {"minY": 1537.5454545454547, "minX": 1.77635352E12, "maxY": 1762.3793103448272, "series": [{"data": [[1.77635364E12, 1618.6666666666667], [1.77635376E12, 1537.5454545454547], [1.77635358E12, 1762.3793103448272], [1.7763537E12, 1747.1785714285713], [1.77635352E12, 1634.8333333333333]], "isOverall": false, "label": "ffmpeg-0 (Split Audio/Video)", "isController": false}], "supportsControllersDiscrimination": true, "granularity": 60000, "maxX": 1.77635376E12, "title": "Latencies Over Time"}},
        getOptions: function() {
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: getTimeFormat(this.data.result.granularity),
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Average response latencies in ms",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendLatenciesOverTime'
                },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s : at %x Average latency was %y ms"
                }
            };
        },
        createGraph: function () {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesLatenciesOverTime"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotLatenciesOverTime"), dataset, options);
            // setup overview
            $.plot($("#overviewLatenciesOverTime"), dataset, prepareOverviewOptions(options));
        }
};

// Latencies Over Time
function refreshLatenciesOverTime(fixTimestamps) {
    var infos = latenciesOverTimeInfos;
    prepareSeries(infos.data);
    if(infos.data.result.series.length == 0) {
        setEmptyGraph("#bodyLatenciesOverTime");
        return;
    }
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 0);
    }
    if(isGraph($("#flotLatenciesOverTime"))) {
        infos.createGraph();
    }else {
        var choiceContainer = $("#choicesLatenciesOverTime");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotLatenciesOverTime", "#overviewLatenciesOverTime");
        $('#footerLatenciesOverTime .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var connectTimeOverTimeInfos = {
        data: {"result": {"minY": 0.5357142857142858, "minX": 1.77635352E12, "maxY": 3.791666666666666, "series": [{"data": [[1.77635364E12, 0.9166666666666666], [1.77635376E12, 0.9999999999999999], [1.77635358E12, 0.7586206896551724], [1.7763537E12, 0.5357142857142858], [1.77635352E12, 3.791666666666666]], "isOverall": false, "label": "ffmpeg-0 (Split Audio/Video)", "isController": false}], "supportsControllersDiscrimination": true, "granularity": 60000, "maxX": 1.77635376E12, "title": "Connect Time Over Time"}},
        getOptions: function() {
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: getTimeFormat(this.data.result.granularity),
                    axisLabel: getConnectTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Average Connect Time in ms",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendConnectTimeOverTime'
                },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s : at %x Average connect time was %y ms"
                }
            };
        },
        createGraph: function () {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesConnectTimeOverTime"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotConnectTimeOverTime"), dataset, options);
            // setup overview
            $.plot($("#overviewConnectTimeOverTime"), dataset, prepareOverviewOptions(options));
        }
};

// Connect Time Over Time
function refreshConnectTimeOverTime(fixTimestamps) {
    var infos = connectTimeOverTimeInfos;
    prepareSeries(infos.data);
    if(infos.data.result.series.length == 0) {
        setEmptyGraph("#bodyConnectTimeOverTime");
        return;
    }
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 0);
    }
    if(isGraph($("#flotConnectTimeOverTime"))) {
        infos.createGraph();
    }else {
        var choiceContainer = $("#choicesConnectTimeOverTime");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotConnectTimeOverTime", "#overviewConnectTimeOverTime");
        $('#footerConnectTimeOverTime .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var responseTimePercentilesOverTimeInfos = {
        data: {"result": {"minY": 1411.0, "minX": 1.77635352E12, "maxY": 2928.0, "series": [{"data": [[1.77635364E12, 2092.0], [1.77635376E12, 1759.0], [1.77635358E12, 2928.0], [1.7763537E12, 2437.0], [1.77635352E12, 1900.0]], "isOverall": false, "label": "Max", "isController": false}, {"data": [[1.77635364E12, 1930.0], [1.77635376E12, 1668.8], [1.77635358E12, 2577.0], [1.7763537E12, 2367.5], [1.77635352E12, 1884.0]], "isOverall": false, "label": "90th percentile", "isController": false}, {"data": [[1.77635364E12, 2092.0], [1.77635376E12, 1759.0], [1.77635358E12, 2928.0], [1.7763537E12, 2437.0], [1.77635352E12, 1900.0]], "isOverall": false, "label": "99th percentile", "isController": false}, {"data": [[1.77635364E12, 2053.25], [1.77635376E12, 1745.6499999999999], [1.77635358E12, 2848.0], [1.7763537E12, 2407.75], [1.77635352E12, 1897.0]], "isOverall": false, "label": "95th percentile", "isController": false}, {"data": [[1.77635364E12, 1439.0], [1.77635376E12, 1411.0], [1.77635358E12, 1425.0], [1.7763537E12, 1412.0], [1.77635352E12, 1446.0]], "isOverall": false, "label": "Min", "isController": false}, {"data": [[1.77635364E12, 1518.0], [1.77635376E12, 1514.0], [1.77635358E12, 1630.0], [1.7763537E12, 1572.5], [1.77635352E12, 1599.0]], "isOverall": false, "label": "Median", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 60000, "maxX": 1.77635376E12, "title": "Response Time Percentiles Over Time (successful requests only)"}},
        getOptions: function() {
            return {
                series: {
                    lines: {
                        show: true,
                        fill: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: getTimeFormat(this.data.result.granularity),
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Response Time in ms",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendResponseTimePercentilesOverTime'
                },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s : at %x Response time was %y ms"
                }
            };
        },
        createGraph: function () {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesResponseTimePercentilesOverTime"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotResponseTimePercentilesOverTime"), dataset, options);
            // setup overview
            $.plot($("#overviewResponseTimePercentilesOverTime"), dataset, prepareOverviewOptions(options));
        }
};

// Response Time Percentiles Over Time
function refreshResponseTimePercentilesOverTime(fixTimestamps) {
    var infos = responseTimePercentilesOverTimeInfos;
    prepareSeries(infos.data);
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 0);
    }
    if(isGraph($("#flotResponseTimePercentilesOverTime"))) {
        infos.createGraph();
    }else {
        var choiceContainer = $("#choicesResponseTimePercentilesOverTime");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotResponseTimePercentilesOverTime", "#overviewResponseTimePercentilesOverTime");
        $('#footerResponseTimePercentilesOverTime .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};


var responseTimeVsRequestInfos = {
    data: {"result": {"minY": 1520.0, "minX": 1.0, "maxY": 1914.0, "series": [{"data": [[1.0, 1520.0], [2.0, 1817.5], [3.0, 1914.0]], "isOverall": false, "label": "Successes", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 1000, "maxX": 3.0, "title": "Response Time Vs Request"}},
    getOptions: function() {
        return {
            series: {
                lines: {
                    show: false
                },
                points: {
                    show: true
                }
            },
            xaxis: {
                axisLabel: "Global number of requests per second",
                axisLabelUseCanvas: true,
                axisLabelFontSizePixels: 12,
                axisLabelFontFamily: 'Verdana, Arial',
                axisLabelPadding: 20,
            },
            yaxis: {
                axisLabel: "Median Response Time in ms",
                axisLabelUseCanvas: true,
                axisLabelFontSizePixels: 12,
                axisLabelFontFamily: 'Verdana, Arial',
                axisLabelPadding: 20,
            },
            legend: {
                noColumns: 2,
                show: true,
                container: '#legendResponseTimeVsRequest'
            },
            selection: {
                mode: 'xy'
            },
            grid: {
                hoverable: true // IMPORTANT! this is needed for tooltip to work
            },
            tooltip: true,
            tooltipOpts: {
                content: "%s : Median response time at %x req/s was %y ms"
            },
            colors: ["#9ACD32", "#FF6347"]
        };
    },
    createGraph: function () {
        var data = this.data;
        var dataset = prepareData(data.result.series, $("#choicesResponseTimeVsRequest"));
        var options = this.getOptions();
        prepareOptions(options, data);
        $.plot($("#flotResponseTimeVsRequest"), dataset, options);
        // setup overview
        $.plot($("#overviewResponseTimeVsRequest"), dataset, prepareOverviewOptions(options));

    }
};

// Response Time vs Request
function refreshResponseTimeVsRequest() {
    var infos = responseTimeVsRequestInfos;
    prepareSeries(infos.data);
    if (isGraph($("#flotResponseTimeVsRequest"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesResponseTimeVsRequest");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotResponseTimeVsRequest", "#overviewResponseTimeVsRequest");
        $('#footerResponseRimeVsRequest .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};


var latenciesVsRequestInfos = {
    data: {"result": {"minY": 1520.0, "minX": 1.0, "maxY": 1913.5, "series": [{"data": [[1.0, 1520.0], [2.0, 1816.5], [3.0, 1913.5]], "isOverall": false, "label": "Successes", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 1000, "maxX": 3.0, "title": "Latencies Vs Request"}},
    getOptions: function() {
        return{
            series: {
                lines: {
                    show: false
                },
                points: {
                    show: true
                }
            },
            xaxis: {
                axisLabel: "Global number of requests per second",
                axisLabelUseCanvas: true,
                axisLabelFontSizePixels: 12,
                axisLabelFontFamily: 'Verdana, Arial',
                axisLabelPadding: 20,
            },
            yaxis: {
                axisLabel: "Median Latency in ms",
                axisLabelUseCanvas: true,
                axisLabelFontSizePixels: 12,
                axisLabelFontFamily: 'Verdana, Arial',
                axisLabelPadding: 20,
            },
            legend: { noColumns: 2,show: true, container: '#legendLatencyVsRequest' },
            selection: {
                mode: 'xy'
            },
            grid: {
                hoverable: true // IMPORTANT! this is needed for tooltip to work
            },
            tooltip: true,
            tooltipOpts: {
                content: "%s : Median Latency time at %x req/s was %y ms"
            },
            colors: ["#9ACD32", "#FF6347"]
        };
    },
    createGraph: function () {
        var data = this.data;
        var dataset = prepareData(data.result.series, $("#choicesLatencyVsRequest"));
        var options = this.getOptions();
        prepareOptions(options, data);
        $.plot($("#flotLatenciesVsRequest"), dataset, options);
        // setup overview
        $.plot($("#overviewLatenciesVsRequest"), dataset, prepareOverviewOptions(options));
    }
};

// Latencies vs Request
function refreshLatenciesVsRequest() {
        var infos = latenciesVsRequestInfos;
        prepareSeries(infos.data);
        if(isGraph($("#flotLatenciesVsRequest"))){
            infos.createGraph();
        }else{
            var choiceContainer = $("#choicesLatencyVsRequest");
            createLegend(choiceContainer, infos);
            infos.createGraph();
            setGraphZoomable("#flotLatenciesVsRequest", "#overviewLatenciesVsRequest");
            $('#footerLatenciesVsRequest .legendColorBox > div').each(function(i){
                $(this).clone().prependTo(choiceContainer.find("li").eq(i));
            });
        }
};

var hitsPerSecondInfos = {
        data: {"result": {"minY": 0.3333333333333333, "minX": 1.77635352E12, "maxY": 0.48333333333333334, "series": [{"data": [[1.77635364E12, 0.4166666666666667], [1.77635376E12, 0.3333333333333333], [1.77635358E12, 0.4666666666666667], [1.7763537E12, 0.48333333333333334], [1.77635352E12, 0.4166666666666667]], "isOverall": false, "label": "hitsPerSecond", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 60000, "maxX": 1.77635376E12, "title": "Hits Per Second"}},
        getOptions: function() {
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: getTimeFormat(this.data.result.granularity),
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Number of hits / sec",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: "#legendHitsPerSecond"
                },
                selection: {
                    mode : 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s at %x was %y.2 hits/sec"
                }
            };
        },
        createGraph: function createGraph() {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesHitsPerSecond"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotHitsPerSecond"), dataset, options);
            // setup overview
            $.plot($("#overviewHitsPerSecond"), dataset, prepareOverviewOptions(options));
        }
};

// Hits per second
function refreshHitsPerSecond(fixTimestamps) {
    var infos = hitsPerSecondInfos;
    prepareSeries(infos.data);
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 0);
    }
    if (isGraph($("#flotHitsPerSecond"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesHitsPerSecond");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotHitsPerSecond", "#overviewHitsPerSecond");
        $('#footerHitsPerSecond .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
}

var codesPerSecondInfos = {
        data: {"result": {"minY": 0.36666666666666664, "minX": 1.77635352E12, "maxY": 0.48333333333333334, "series": [{"data": [[1.77635364E12, 0.4], [1.77635376E12, 0.36666666666666664], [1.77635358E12, 0.48333333333333334], [1.7763537E12, 0.4666666666666667], [1.77635352E12, 0.4]], "isOverall": false, "label": "200", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 60000, "maxX": 1.77635376E12, "title": "Codes Per Second"}},
        getOptions: function(){
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: getTimeFormat(this.data.result.granularity),
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Number of responses / sec",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: "#legendCodesPerSecond"
                },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "Number of Response Codes %s at %x was %y.2 responses / sec"
                }
            };
        },
    createGraph: function() {
        var data = this.data;
        var dataset = prepareData(data.result.series, $("#choicesCodesPerSecond"));
        var options = this.getOptions();
        prepareOptions(options, data);
        $.plot($("#flotCodesPerSecond"), dataset, options);
        // setup overview
        $.plot($("#overviewCodesPerSecond"), dataset, prepareOverviewOptions(options));
    }
};

// Codes per second
function refreshCodesPerSecond(fixTimestamps) {
    var infos = codesPerSecondInfos;
    prepareSeries(infos.data);
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 0);
    }
    if(isGraph($("#flotCodesPerSecond"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesCodesPerSecond");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotCodesPerSecond", "#overviewCodesPerSecond");
        $('#footerCodesPerSecond .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var transactionsPerSecondInfos = {
        data: {"result": {"minY": 0.36666666666666664, "minX": 1.77635352E12, "maxY": 0.48333333333333334, "series": [{"data": [[1.77635364E12, 0.4], [1.77635376E12, 0.36666666666666664], [1.77635358E12, 0.48333333333333334], [1.7763537E12, 0.4666666666666667], [1.77635352E12, 0.4]], "isOverall": false, "label": "ffmpeg-0 (Split Audio/Video)-success", "isController": false}], "supportsControllersDiscrimination": true, "granularity": 60000, "maxX": 1.77635376E12, "title": "Transactions Per Second"}},
        getOptions: function(){
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: getTimeFormat(this.data.result.granularity),
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Number of transactions / sec",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: "#legendTransactionsPerSecond"
                },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s at %x was %y transactions / sec"
                }
            };
        },
    createGraph: function () {
        var data = this.data;
        var dataset = prepareData(data.result.series, $("#choicesTransactionsPerSecond"));
        var options = this.getOptions();
        prepareOptions(options, data);
        $.plot($("#flotTransactionsPerSecond"), dataset, options);
        // setup overview
        $.plot($("#overviewTransactionsPerSecond"), dataset, prepareOverviewOptions(options));
    }
};

// Transactions per second
function refreshTransactionsPerSecond(fixTimestamps) {
    var infos = transactionsPerSecondInfos;
    prepareSeries(infos.data);
    if(infos.data.result.series.length == 0) {
        setEmptyGraph("#bodyTransactionsPerSecond");
        return;
    }
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 0);
    }
    if(isGraph($("#flotTransactionsPerSecond"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesTransactionsPerSecond");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotTransactionsPerSecond", "#overviewTransactionsPerSecond");
        $('#footerTransactionsPerSecond .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var totalTPSInfos = {
        data: {"result": {"minY": 0.36666666666666664, "minX": 1.77635352E12, "maxY": 0.48333333333333334, "series": [{"data": [[1.77635364E12, 0.4], [1.77635376E12, 0.36666666666666664], [1.77635358E12, 0.48333333333333334], [1.7763537E12, 0.4666666666666667], [1.77635352E12, 0.4]], "isOverall": false, "label": "Transaction-success", "isController": false}, {"data": [], "isOverall": false, "label": "Transaction-failure", "isController": false}], "supportsControllersDiscrimination": true, "granularity": 60000, "maxX": 1.77635376E12, "title": "Total Transactions Per Second"}},
        getOptions: function(){
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: getTimeFormat(this.data.result.granularity),
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Number of transactions / sec",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: "#legendTotalTPS"
                },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s at %x was %y transactions / sec"
                },
                colors: ["#9ACD32", "#FF6347"]
            };
        },
    createGraph: function () {
        var data = this.data;
        var dataset = prepareData(data.result.series, $("#choicesTotalTPS"));
        var options = this.getOptions();
        prepareOptions(options, data);
        $.plot($("#flotTotalTPS"), dataset, options);
        // setup overview
        $.plot($("#overviewTotalTPS"), dataset, prepareOverviewOptions(options));
    }
};

// Total Transactions per second
function refreshTotalTPS(fixTimestamps) {
    var infos = totalTPSInfos;
    // We want to ignore seriesFilter
    prepareSeries(infos.data, false, true);
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 0);
    }
    if(isGraph($("#flotTotalTPS"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesTotalTPS");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotTotalTPS", "#overviewTotalTPS");
        $('#footerTotalTPS .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

// Collapse the graph matching the specified DOM element depending the collapsed
// status
function collapse(elem, collapsed){
    if(collapsed){
        $(elem).parent().find(".fa-chevron-up").removeClass("fa-chevron-up").addClass("fa-chevron-down");
    } else {
        $(elem).parent().find(".fa-chevron-down").removeClass("fa-chevron-down").addClass("fa-chevron-up");
        if (elem.id == "bodyBytesThroughputOverTime") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshBytesThroughputOverTime(true);
            }
            document.location.href="#bytesThroughputOverTime";
        } else if (elem.id == "bodyLatenciesOverTime") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshLatenciesOverTime(true);
            }
            document.location.href="#latenciesOverTime";
        } else if (elem.id == "bodyCustomGraph") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshCustomGraph(true);
            }
            document.location.href="#responseCustomGraph";
        } else if (elem.id == "bodyConnectTimeOverTime") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshConnectTimeOverTime(true);
            }
            document.location.href="#connectTimeOverTime";
        } else if (elem.id == "bodyResponseTimePercentilesOverTime") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshResponseTimePercentilesOverTime(true);
            }
            document.location.href="#responseTimePercentilesOverTime";
        } else if (elem.id == "bodyResponseTimeDistribution") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshResponseTimeDistribution();
            }
            document.location.href="#responseTimeDistribution" ;
        } else if (elem.id == "bodySyntheticResponseTimeDistribution") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshSyntheticResponseTimeDistribution();
            }
            document.location.href="#syntheticResponseTimeDistribution" ;
        } else if (elem.id == "bodyActiveThreadsOverTime") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshActiveThreadsOverTime(true);
            }
            document.location.href="#activeThreadsOverTime";
        } else if (elem.id == "bodyTimeVsThreads") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshTimeVsThreads();
            }
            document.location.href="#timeVsThreads" ;
        } else if (elem.id == "bodyCodesPerSecond") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshCodesPerSecond(true);
            }
            document.location.href="#codesPerSecond";
        } else if (elem.id == "bodyTransactionsPerSecond") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshTransactionsPerSecond(true);
            }
            document.location.href="#transactionsPerSecond";
        } else if (elem.id == "bodyTotalTPS") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshTotalTPS(true);
            }
            document.location.href="#totalTPS";
        } else if (elem.id == "bodyResponseTimeVsRequest") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshResponseTimeVsRequest();
            }
            document.location.href="#responseTimeVsRequest";
        } else if (elem.id == "bodyLatenciesVsRequest") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshLatenciesVsRequest();
            }
            document.location.href="#latencyVsRequest";
        }
    }
}

/*
 * Activates or deactivates all series of the specified graph (represented by id parameter)
 * depending on checked argument.
 */
function toggleAll(id, checked){
    var placeholder = document.getElementById(id);

    var cases = $(placeholder).find(':checkbox');
    cases.prop('checked', checked);
    $(cases).parent().children().children().toggleClass("legend-disabled", !checked);

    var choiceContainer;
    if ( id == "choicesBytesThroughputOverTime"){
        choiceContainer = $("#choicesBytesThroughputOverTime");
        refreshBytesThroughputOverTime(false);
    } else if(id == "choicesResponseTimesOverTime"){
        choiceContainer = $("#choicesResponseTimesOverTime");
        refreshResponseTimeOverTime(false);
    }else if(id == "choicesResponseCustomGraph"){
        choiceContainer = $("#choicesResponseCustomGraph");
        refreshCustomGraph(false);
    } else if ( id == "choicesLatenciesOverTime"){
        choiceContainer = $("#choicesLatenciesOverTime");
        refreshLatenciesOverTime(false);
    } else if ( id == "choicesConnectTimeOverTime"){
        choiceContainer = $("#choicesConnectTimeOverTime");
        refreshConnectTimeOverTime(false);
    } else if ( id == "choicesResponseTimePercentilesOverTime"){
        choiceContainer = $("#choicesResponseTimePercentilesOverTime");
        refreshResponseTimePercentilesOverTime(false);
    } else if ( id == "choicesResponseTimePercentiles"){
        choiceContainer = $("#choicesResponseTimePercentiles");
        refreshResponseTimePercentiles();
    } else if(id == "choicesActiveThreadsOverTime"){
        choiceContainer = $("#choicesActiveThreadsOverTime");
        refreshActiveThreadsOverTime(false);
    } else if ( id == "choicesTimeVsThreads"){
        choiceContainer = $("#choicesTimeVsThreads");
        refreshTimeVsThreads();
    } else if ( id == "choicesSyntheticResponseTimeDistribution"){
        choiceContainer = $("#choicesSyntheticResponseTimeDistribution");
        refreshSyntheticResponseTimeDistribution();
    } else if ( id == "choicesResponseTimeDistribution"){
        choiceContainer = $("#choicesResponseTimeDistribution");
        refreshResponseTimeDistribution();
    } else if ( id == "choicesHitsPerSecond"){
        choiceContainer = $("#choicesHitsPerSecond");
        refreshHitsPerSecond(false);
    } else if(id == "choicesCodesPerSecond"){
        choiceContainer = $("#choicesCodesPerSecond");
        refreshCodesPerSecond(false);
    } else if ( id == "choicesTransactionsPerSecond"){
        choiceContainer = $("#choicesTransactionsPerSecond");
        refreshTransactionsPerSecond(false);
    } else if ( id == "choicesTotalTPS"){
        choiceContainer = $("#choicesTotalTPS");
        refreshTotalTPS(false);
    } else if ( id == "choicesResponseTimeVsRequest"){
        choiceContainer = $("#choicesResponseTimeVsRequest");
        refreshResponseTimeVsRequest();
    } else if ( id == "choicesLatencyVsRequest"){
        choiceContainer = $("#choicesLatencyVsRequest");
        refreshLatenciesVsRequest();
    }
    var color = checked ? "black" : "#818181";
    if(choiceContainer != null) {
        choiceContainer.find("label").each(function(){
            this.style.color = color;
        });
    }
}

