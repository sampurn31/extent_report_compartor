import React, { useState, useRef } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  TextField,
  Box,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Grid,
  Card,
  CardContent,
  IconButton,
  InputAdornment,
  Stack,
  Tabs,
  Tab,
  Tooltip,
  Drawer
} from '@mui/material';
import {
  Search as SearchIcon,
  Upload as UploadIcon,
  Delete as DeleteIcon,
  TrendingDown,
  TrendingUp,
  Close as CloseIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const DRAWER_WIDTH = 400;

function App() {
  const [numReports, setNumReports] = useState(2);
  const [files, setFiles] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [searchResults, setSearchResults] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [isSearchDrawerOpen, setIsSearchDrawerOpen] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files);
    
    // Validate file size and content
    const validFiles = selectedFiles.filter(file => {
      if (file.size === 0) {
        alert(`File ${file.name} is empty. Please select a valid file.`);
        return false;
      }
      if (file.size > 32 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Maximum size is 32MB.`);
        return false;
      }
      if (!file.name.toLowerCase().endsWith('.html')) {
        alert(`File ${file.name} is not an HTML file.`);
        return false;
      }
      return true;
    });

    const newFiles = [...files, ...validFiles];
    
    if (newFiles.length > numReports) {
      alert(`You can only select up to ${numReports} files. Please remove some files first.`);
      return;
    }
    
    // Check for duplicate files
    const uniqueFiles = newFiles.filter((file, index, self) =>
      index === self.findIndex((f) => f.name === file.name)
    );
    
    setFiles(uniqueFiles);
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (fileToRemove) => {
    setFiles(files.filter(file => file !== fileToRemove));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      alert('Please select files first');
      return;
    }

    if (files.length < 2) {
      alert('Please select at least 2 files to compare');
      return;
    }

    // Validate files again before upload
    const invalidFiles = files.filter(file => 
      file.size === 0 || file.size > 32 * 1024 * 1024 || !file.name.toLowerCase().endsWith('.html')
    );
    
    if (invalidFiles.length > 0) {
      alert(`Some files are invalid:\n${invalidFiles.map(f => f.name).join('\n')}`);
      return;
    }

    setLoading(true);
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    try {
      console.log('Uploading files...');
      const uploadResponse = await axios.post(`${API_URL}/upload`, formData);
      console.log('Upload response:', uploadResponse.data);
      setUploadedFiles(files.map(f => f.name));

      // Get the saved file paths from the response
      const savedFiles = uploadResponse.data.files;
      console.log('Saved files:', savedFiles);

      if (!savedFiles || savedFiles.length === 0) {
        throw new Error('No files were successfully uploaded');
      }

      // Use the saved file paths for analysis
      const analysisResponse = await axios.post(`${API_URL}/analyze`, {
        reportPaths: savedFiles
      });
      console.log('Analysis response:', analysisResponse.data);
      setAnalysisResults(analysisResponse.data);
    } catch (error) {
      console.error('Error details:', error.response?.data || error.message);
      let errorMessage = 'Error uploading or analyzing files.';
      
      if (error.response?.data?.error) {
        errorMessage = `Server Error: ${error.response.data.error}`;
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      alert(errorMessage + '\nPlease check the browser console for more details.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery) {
      alert('Please enter a test name to search');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/search`, {
        testName: searchQuery,
        reportPaths: files.map(f => `uploads/${f.name}`)
      });
      setSearchResults(response.data);
      setIsSearchDrawerOpen(true);
    } catch (error) {
      console.error('Search error:', error);
      alert('Error searching test');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pass':
        return 'success';
      case 'fail':
        return 'error';
      default:
        return 'default';
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const renderTestStats = (stats) => (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Test Name</TableCell>
            <TableCell align="center">Failure Count</TableCell>
            <TableCell align="center">Total Executions</TableCell>
            <TableCell align="center">Failure Rate</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {stats.map((test) => (
            <TableRow key={test.name}>
              <TableCell>{test.name}</TableCell>
              <TableCell align="center">
                <Chip
                  label={test.failureCount}
                  color={test.failureCount > 0 ? "error" : "success"}
                  size="small"
                />
              </TableCell>
              <TableCell align="center">{test.executionCount}</TableCell>
              <TableCell align="center">
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {test.failureRate}%
                  {test.failureRate > 50 ? (
                    <TrendingUp color="error" sx={{ ml: 1 }} />
                  ) : (
                    <TrendingDown color="success" sx={{ ml: 1 }} />
                  )}
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const sortFailingTestsByCount = (failingTests) => {
    return Object.entries(failingTests)
      .map(([test, reports]) => ({
        test,
        reports,
        count: reports.length
      }))
      .sort((a, b) => b.count - a.count);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Extent Report Analyzer
        </Typography>

        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              label="Search Test"
              placeholder="Enter test name to search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={handleSearch} disabled={loading}>
                      {loading ? <CircularProgress size={24} /> : <SearchIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              type="number"
              label="Number of Reports to Compare"
              value={numReports}
              onChange={(e) => {
                const value = Math.max(2, parseInt(e.target.value) || 2);
                setNumReports(value);
                if (files.length > value) {
                  setFiles(files.slice(0, value));
                }
              }}
              fullWidth
              InputProps={{ inputProps: { min: 2 } }}
            />
          </Grid>
        </Grid>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Button
            variant="contained"
            component="label"
            startIcon={<UploadIcon />}
            fullWidth
            disabled={files.length >= numReports}
          >
            Add Report{files.length >= numReports ? 's (Max Reached)' : 's'}
            <input
              type="file"
              hidden
              multiple
              accept=".html"
              onChange={handleFileChange}
              ref={fileInputRef}
            />
          </Button>

          {files.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Selected Files ({files.length}/{numReports}):
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                {files.map((file, index) => (
                  <Chip
                    key={index}
                    label={file.name}
                    onDelete={() => handleRemoveFile(file)}
                    deleteIcon={<DeleteIcon />}
                    sx={{ m: 0.5 }}
                  />
                ))}
              </Stack>
              <Button
                variant="contained"
                onClick={handleUpload}
                disabled={loading || files.length < 2}
                sx={{ mt: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Upload and Analyze'}
              </Button>
            </Box>
          )}
        </Paper>

        {analysisResults && (
          <Card>
            <CardContent>
              <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs value={activeTab} onChange={handleTabChange}>
                  <Tab label="Common Failing Tests" />
                  <Tab label="By Failure Count" />
                  <Tab label="By Failure Rate" />
                </Tabs>
              </Box>

              {activeTab === 0 && (
                <>
                  <Typography variant="h6" gutterBottom>
                    Common Failing Tests
                  </Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Test Name</TableCell>
                          <TableCell>Failed in Reports</TableCell>
                          <TableCell align="center">Failure Count</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {sortFailingTestsByCount(analysisResults.failingTests).map(({ test, reports, count }) => (
                          <TableRow key={test}>
                            <TableCell>{test}</TableCell>
                            <TableCell>
                              {reports.map((report, index) => (
                                <Chip
                                  key={index}
                                  label={report}
                                  color="error"
                                  size="small"
                                  sx={{ m: 0.5 }}
                                />
                              ))}
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={count}
                                color="error"
                                size="small"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}

              {activeTab === 1 && (
                <>
                  <Typography variant="h6" gutterBottom>
                    Tests Sorted by Failure Count
                  </Typography>
                  {renderTestStats(analysisResults.testStats.byFailureCount)}
                </>
              )}

              {activeTab === 2 && (
                <>
                  <Typography variant="h6" gutterBottom>
                    Tests Sorted by Failure Rate
                  </Typography>
                  {renderTestStats(analysisResults.testStats.byFailureRate)}
                </>
              )}
            </CardContent>
          </Card>
        )}
      </Container>

      <Drawer
        anchor="right"
        open={isSearchDrawerOpen}
        onClose={() => setIsSearchDrawerOpen(false)}
        variant="persistent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            padding: 2,
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Search Results</Typography>
          <IconButton onClick={() => setIsSearchDrawerOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>

        {searchResults && (
          <>
            {searchResults.stats.length > 0 ? (
              <>
                <Typography variant="subtitle2" gutterBottom>
                  Test Statistics
                </Typography>
                {renderTestStats(searchResults.stats)}
                
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 3 }}>
                  Detailed Results
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Test Name</TableCell>
                        {uploadedFiles.map((file, index) => (
                          <TableCell key={index}>{file}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(searchResults.results).map(([test, results]) => (
                        <TableRow key={test}>
                          <TableCell>{test}</TableCell>
                          {uploadedFiles.map((file, index) => (
                            <TableCell key={index}>
                              <Chip
                                label={results[file] || 'N/A'}
                                color={getStatusColor(results[file])}
                                size="small"
                              />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            ) : (
              <Typography color="text.secondary">
                No tests found matching your search criteria
              </Typography>
            )}
          </>
        )}
      </Drawer>
    </Box>
  );
}

export default App; 