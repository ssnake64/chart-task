import React, { useState, useEffect, useRef } from "react";
import Highcharts from "highcharts/highstock";
import HighchartsReact from "highcharts-react-official";
import axios from "axios";
import "../stockchart.css";



// Predefined SMA periods
const SMAS_PERIODS = [20, 50, 100, 200];
const PREDEFINED_PERIODS = [
  { label: "1D", value: "1", days: 1 },
  { label: "1W", value: "5", days: 5 },
  { label: "1M", value: "20", days: 20 },
  { label: "3M", value: "60", days: 60 },
  { label: "6M", value: "120", days: 120 },
  { label: "1Y", value: "365", days: 365 },
  { label: "Custom", value: "custom", days: 0 },
];

const StockChart: React.FC = () => {
  const [options, setOptions] = useState<Highcharts.Options>({
    title: { text: "Stock Price" },
    series: [],
    rangeSelector: {
      selected: 1,
      buttons: [
        { type: "day", count: 1, text: "1D" },
        { type: "week", count: 1, text: "1W" },
        { type: "month", count: 1, text: "1M" },
        { type: "month", count: 3, text: "3M" },
        { type: "month", count: 6, text: "6M" },
        { type: "ytd", text: "YTD" },
        { type: "year", count: 1, text: "1Y" },
        { type: "all", text: "All" },
      ],
    },
  });
  const [ticker, setTicker] = useState("AAPL");
  const [selectedPeriod, setSelectedPeriod] = useState(PREDEFINED_PERIODS[5]); // 1Y by default
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedSMAs, setSelectedSMAs] = useState<number[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [currentVolume, setCurrentVolume] = useState<number | null>(null);
  const [currentDate, setCurrentDate] = useState<string>("");
  const chartRef = useRef<HighchartsReact.RefObject>(null);

  // Calculate dates for API call
  const calculateDateRange = () => {
    const endDate = new Date();
    const startDate = new Date();
    
    if (selectedPeriod.value === "custom") {
      return {
        startDate: customStartDate,
        endDate: customEndDate
      };
    }
    
    startDate.setDate(startDate.getDate() - selectedPeriod.days);
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };

  // Function to fetch data from Polygon.io
  const fetchStockData = async (symbol: string) => {
    try {
      const { startDate, endDate } = calculateDateRange();
      const multiplier = 1;
      const timespan = "day";
      
      const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${startDate}/${endDate}?apiKey=pshN1v_d8lrdJTdTvJT74o9gayqQrYPN`;
      
      const res = await axios.get(url);
      const results = res.data.results;

      if (!results || results.length === 0) {
        throw new Error("No data available for this symbol and time period");
      }

      // Process OHLCV data
      const ohlc: [number, number, number, number, number][] = results.map(
        (result: any) => [
          result.t, // timestamp
          result.o, // open
          result.h, // high
          result.l, // low
          result.c, // close
        ]
      );

      const volume: [number, number][] = results.map((result: any) => [
        result.t,
        result.v, // volume
      ]);

      // Calculate SMAs
      const smaSeries: Highcharts.SeriesOptionsType[] = [];
      selectedSMAs.forEach((period) => {
        const smaData: [number, number][] = [];
        
        for (let i = period - 1; i < results.length; i++) {
          let sum = 0;
          for (let j = 0; j < period; j++) {
            sum += results[i - j].c;
          }
          smaData.push([results[i].t, sum / period]);
        }
        
        smaSeries.push({
          type: "sma",
          name: `SMA(${period})`,
          data: smaData,
          color: getColorForSMA(period),
          lineWidth: 1,
          marker: {
            enabled: false,
          },
          tooltip: {
            valueDecimals: 2,
          },
        });
      });

      // Prepare series array
      const series: Highcharts.SeriesOptionsType[] = [
        {
          type: "candlestick",
          name: symbol,
          id: "primary",
          data: ohlc,
        },
        {
          type: "column",
          name: "Volume",
          data: volume,
          yAxis: 1,
        },
        ...smaSeries,
      ];

      setOptions({
        title: { text: `${symbol} Stock Price` },
        series,
        yAxis: [
          {
            title: { text: "Price" },
            height: "70%",
          },
          {
            title: { text: "Volume" },
            top: "75%",
            height: "25%",
            offset: 0,
          },
        ],
        plotOptions: {
          candlestick: {
            color: "red",
            upColor: "green",
            lineColor: "red",
            upLineColor: "green",
          },
        },
        tooltip: {
          split: true,
          formatter: function (this: Highcharts.TooltipFormatterContextObject) {
            // Custom tooltip formatting
            return false; // Use default formatting
          },
        },
      });

      // Set initial price and volume
      const latestData = results[results.length - 1];
      setCurrentPrice(latestData.c);
      setCurrentVolume(latestData.v);
      setCurrentDate(new Date(latestData.t).toLocaleDateString());
    } catch (error) {
      console.error("Error fetching stock data", error);
      alert("Error fetching data. Please check the ticker symbol and try again.");
    }
  };

  // Helper function to get colors for SMAs
  const getColorForSMA = (period: number): string => {
    const colors = ["#FF5733", "#33FF57", "#3357FF", "#F333FF"];
    return colors[SMAS_PERIODS.indexOf(period) % colors.length];
  };

  // Handle SMA selection
  const toggleSMA = (period: number) => {
    if (selectedSMAs.includes(period)) {
      setSelectedSMAs(selectedSMAs.filter((p) => p !== period));
    } else {
      setSelectedSMAs([...selectedSMAs, period]);
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStockData(ticker);
  };

  // Handle period change
  const handlePeriodChange = (period: typeof PREDEFINED_PERIODS[0]) => {
    setSelectedPeriod(period);
  };

  // Handle chart events
  useEffect(() => {
    if (chartRef.current && chartRef.current.chart) {
      const chart = chartRef.current.chart;

      // Add event listener for mouse move
      chart.container.addEventListener("mousemove", (e: any) => {
        const event = chart.pointer.normalize(e);
        const x = event.chartX;
        const y = event.chartY;
        
        // Find the closest point
        const points = chart.series[0].points;
        let closestPoint = points[0];
        let minDistance = Math.abs(closestPoint.plotX - x);
        
        for (let i = 1; i < points.length; i++) {
          const distance = Math.abs(points[i].plotX - x);
          if (distance < minDistance) {
            minDistance = distance;
            closestPoint = points[i];
          }
        }
        
        // Update current price and volume
        if (closestPoint) {
          setCurrentPrice(closestPoint.close);
          setCurrentVolume(
            chart.series[1].points.find(
              (p: any) => p.x === closestPoint.x
            )?.y
          );
          setCurrentDate(new Date(closestPoint.x).toLocaleDateString());
        }
      });
    }
  }, [options]);

  // Fetch data on initial load
  useEffect(() => {
    fetchStockData(ticker);
  }, []);

  return (
    <div className="stock-chart-container">
      <div className="controls">
        <form onSubmit={handleSubmit} className="ticker-form">
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="Enter stock ticker (e.g., AAPL)"
            className="bg-[#F0F0F0] text-black"
          />
          <button type="submit" className="bg-[#F0F0F0] text-black">Load Chart</button>
        </form>

        <div className="period-selector">
          <label>Time Period:</label>
          {PREDEFINED_PERIODS.map((period) => (
            <button
              key={period.value}
              type="button"
              className={selectedPeriod.value === period.value ? "active" : "text-black"}
              onClick={() => handlePeriodChange(period)}
            >
              {period.label}
            </button>
          ))}
        </div>

        {selectedPeriod.value === "custom" && (
          <div className="custom-date-picker">
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              placeholder="Start Date"
            />
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              placeholder="End Date"
            />
          </div>
        )}

        <div className="sma-selector">
          <label>SMAs:</label>
          {SMAS_PERIODS.map((period) => (
            <button
              key={period}
              type="button"
              className={selectedSMAs.includes(period) ? "active" : "text-black"}
              onClick={() => toggleSMA(period)}
            >
              SMA({period})
            </button>
          ))}
        </div>
      </div>

      <div className="price-display">
        <div className="price-info">
          <span className="font-bold text-black text-xl">{ticker}</span>
          <span className="current-price">{currentPrice?.toFixed(2) || "N/A"}</span>
          <span className="current-date">{currentDate}</span>
        </div>
        <div className="text-black flex items-center justify-center gap-2">
          <span className="text-black font-semibold text-lg">
          Volume:
          </span> 
          <span className="text-green-400 font-semibold text-lg">
          {currentVolume ? (currentVolume / 1000).toFixed(1) + "K" : "N/A"}
          </span>
        </div>
      </div>

      <HighchartsReact
        ref={chartRef}
        highcharts={Highcharts}
        constructorType={"stockChart"}
        options={options}
      />
    </div>
  );
};

export default StockChart;