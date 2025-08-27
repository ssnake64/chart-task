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
    
      chart: {
      height: 600, // This sets the chart height
    },
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

      buttonTheme: {
      width: 60,
      height: 28,
      zIndex: 50000,
      style: { 
        fontSize: "12px",
      },
      },
      dropdown: "responsive", // "always" | "responsive" | "never"
    },
  });
  const [ticker, setTicker] = useState("AAPL");
  const [selectedPeriod, setSelectedPeriod] = useState(PREDEFINED_PERIODS[5]); // 1Y by default

  const [selectedSMAs, setSelectedSMAs] = useState<number[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [currentVolume, setCurrentVolume] = useState<number | null>(null);
  const [currentDate, setCurrentDate] = useState<string>("");
  const [currentOpen, setCurrentOpen] = useState<number | null>(null);
  const [currentHigh, setCurrentHigh] = useState<number | null>(null);
  const [currentLow, setCurrentLow] = useState<number | null>(null);
  const [currentClose, setCurrentClose] = useState<number | null>(null);
  const [activeTicker, setActiveTicker] = useState("AAPL");
  const chartRef = useRef<HighchartsReact.RefObject>(null);


  // Calculate dates for API call
  const calculateDateRange = () => {
    const endDate = new Date();
    const startDate = new Date();
    
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
      
      const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${startDate}/${endDate}?apiKey=${import.meta.env.VITE_POLYGON_API}`;
      
      const res = await axios.get(url);
      const results = res.data.results;

      if (!results || results.length === 0) {
        throw new Error("No data available for this symbol and time period");
      }

      setActiveTicker(symbol);

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

          type: "line",
          name: `SMA(${period})`,
          data: smaData,
          color: getColorForSMA(period),
          lineWidth: 1,
          marker: { enabled: false },
          tooltip: { valueDecimals: 2 },
        } as Highcharts.SeriesLineOptions);

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
          setCurrentOpen((closestPoint as any).open);
          setCurrentHigh((closestPoint as any).high);
          setCurrentLow((closestPoint as any).low);
          setCurrentClose((closestPoint as any).close);
          setCurrentDate(new Date(closestPoint.x).toLocaleDateString());
        }
      });
    }
  }, [options]);

  // Fetch data on initial load
useEffect(() => {
  fetchStockData(ticker);
}, [ selectedSMAs,selectedPeriod]);

return (
  <div
    className="min-h-screen w-full flex flex-col justify-center items-center"
  >
    
    {/* Controls */}
    <div className="flex flex-col md:flex-row gap-4 w-full max-w-6xl flex-wrap">
      {/* Ticker Form */}
      <form
        onSubmit={handleSubmit}
        className="flex gap-2 items-center w-full md:w-auto"
      >
        <input
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          placeholder="Enter stock ticker (e.g., AAPL)"
          className="bg-gray-200 text-black px-3 py-2 border border-gray-300 rounded flex-1"
        />
        <button
          type="submit"
          className="px-3 py-2 bg-blue-500 border rounded cursor-pointer transition-colors duration-200 hover:bg-blue-600"
        >
          Load Chart
        </button>
      </form>

      {/* SMA Selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <label className="font-bold mr-2">SMAs:</label>
        {SMAS_PERIODS.map((period) => {
          const isActive = selectedSMAs.includes(period);
          return (
            <button
              key={period}
              type="button"
              onClick={() => toggleSMA(period)}
              className={`px-3 py-2 border rounded cursor-pointer transition-colors duration-200 ${
                isActive
                  ? "bg-blue-500 text-white border-blue-500"
                  : "bg-gray-200 text-black border-gray-300 hover:bg-gray-300"
              }`}
            >
              SMA({period})
            </button>
          );
        })}
      </div>
    </div>

    {/* Price Info */}
    <div className="flex flex-col sm:flex-row justify-between mb-3 mt-3 p-3 rounded-sm bg-white w-full max-w-6xl">
      <div className="price-info flex gap-2 items-center justify-start flex-wrap">
        <span className="font-bold text-black text-xl">{activeTicker}</span>
        <span className="text-blue-500 font-bold text-xl">{currentPrice?.toFixed(2) || "N/A"}</span>
      </div>

        <span className="text-black font-medium text-lg">
        Date: 
        <span className="text-black text-lg font-medium ml-1">
        {currentDate}
        </span>
        </span>
      <div className="text-black flex items-center justify-start gap-2 mt-2 sm:mt-0">
      <span className="text-black font-medium text-lg">
        O:
        <span className='text-red-500 text-lg font-medium ml-1'>
        {currentOpen?.toFixed(2) || "N/A"}
          </span> 
        </span>
      <span className="text-black font-medium text-lg">
        H:
        <span className='text-red-500 text-lg font-medium ml-1'>
        {currentHigh?.toFixed(2) || "N/A"}
          </span> 
        </span>
      <span className="text-black font-medium text-lg">
        L:
        <span className='text-red-500 text-lg font-medium ml-1'>
        {currentLow?.toFixed(2) || "N/A"}
          </span> 
        </span>
      <span className="text-black font-medium text-lg">
        C:
        <span className='text-red-500 text-lg font-medium ml-1'>
        {currentClose?.toFixed(2) || "N/A"}
          </span> 
        </span>
      </div>
    </div>

    {/* Chart */}
    <HighchartsReact
      containerProps={{ className: "w-full max-w-6xl" }}
      ref={chartRef}
      highcharts={Highcharts}
      constructorType={"stockChart"}
      options={options}
    />
  </div>
);
};

export default StockChart;