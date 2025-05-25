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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Tooltip,
  Drawer,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  Upload as UploadIcon,
  Delete as DeleteIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  Close as CloseIcon,
  TrendingDown,
  TrendingUp,
} from '@mui/icons-material';
import axios from 'axios';

// Update the API_URL to always use localhost
const API_URL = 'http://localhost:5000';
const DRAWER_WIDTH = 400;
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

function App() {
  const [numReports, setNumReports] = useState(2);
  const [files, setFiles] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [searchResults, setSearchResults] = useState(null);
  const [isSearchDrawerOpen, setIsSearchDrawerOpen] = useState(false);
  const [selectedReports, setSelectedReports] = useState([]);
  const [sortBy, setSortBy] = useState('failureCount');
  const [filterOptions, setFilterOptions] = useState({
    showOnlyMultipleFailures: false,
    showOnlyConsistentFailures: false,
    minFailureCount: 1
  });
  const fileInputRef = useRef(null);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files);
    
    // Validate file size and content
    const validFiles = selectedFiles.filter(file => {
      if (file.size === 0) {
        alert(`File ${file.name} is empty. Please select a valid file.`);
        return false;
      }
      if (file.size > MAX_FILE_SIZE) {
        alert(`File ${file.name} is too large (${formatFileSize(file.size)}). Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.`);
        return false;
      }
      if (!file.name.toLowerCase().endsWith('.html')) {
        alert(`File ${file.name} is not an HTML file.`);
        return false;
      }
      return true;
    });

    // Calculate total size
    const totalSize = validFiles.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > MAX_FILE_SIZE) {
      alert(`Total file size (${formatFileSize(totalSize)}) exceeds maximum allowed size (${formatFileSize(MAX_FILE_SIZE)})`);
      return;
    }

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
    setSelectedReports(uniqueFiles.map(f => f.name));
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (fileToRemove) => {
    setFiles(files.filter(file => file !== fileToRemove));
    setSelectedReports(selectedReports.filter(name => name !== fileToRemove.name));
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
      file.size === 0 || file.size > MAX_FILE_SIZE || !file.name.toLowerCase().endsWith('.html')
    );
    
    if (invalidFiles.length > 0) {
      alert(`Some files are invalid:\n${invalidFiles.map(f => f.name).join('\n')}`);
      return;
    }

    // Calculate total size
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > MAX_FILE_SIZE) {
      alert(`Total file size (${formatFileSize(totalSize)}) exceeds maximum allowed size (${formatFileSize(MAX_FILE_SIZE)})`);
      return;
    }

    setLoading(true);
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    try {
      const uploadResponse = await axios.post(`${API_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        maxContentLength: MAX_FILE_SIZE,
        maxBodyLength: MAX_FILE_SIZE
      });

      setUploadedFiles(files.map(f => f.name));
      const savedFiles = uploadResponse.data.files;

      if (!savedFiles || savedFiles.length === 0) {
        throw new Error('No files were successfully uploaded');
      }

      const analysisResponse = await axios.post(`${API_URL}/analyze`, {
        reportPaths: savedFiles
      });
      setAnalysisResults(analysisResponse.data);
    } catch (error) {
      console.error('Error details:', error);
      let errorMessage = 'Error uploading or analyzing files.';
      
      if (error.response?.status === 413) {
        errorMessage = `File size too large. Maximum allowed size is ${formatFileSize(MAX_FILE_SIZE)}.`;
      } else if (error.response?.data?.error) {
        errorMessage = `Server Error: ${error.response.data.error}`;
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      if (error.code === 'ERR_NETWORK') {
        errorMessage = 'Network error: Unable to connect to the server. Please check your internet connection and try again.';
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

  const filterAndSortFailingTests = (failingTests) => {
    if (!failingTests) return [];

    let filteredTests = Object.entries(failingTests)
      .map(([test, reports]) => ({
        test,
        reports: reports.filter(report => selectedReports.includes(report)),
        allReports: reports
      }))
      .filter(({ reports }) => reports.length > 0);

    // Apply filters
    if (filterOptions.showOnlyMultipleFailures) {
      filteredTests = filteredTests.filter(({ reports }) => reports.length > 1);
    }

    if (filterOptions.showOnlyConsistentFailures) {
      filteredTests = filteredTests.filter(({ reports, allReports }) => 
        reports.length === selectedReports.length
      );
    }

    if (filterOptions.minFailureCount > 1) {
      filteredTests = filteredTests.filter(({ reports }) => 
        reports.length >= filterOptions.minFailureCount
      );
    }

    // Apply sorting
    switch (sortBy) {
      case 'failureCount':
        filteredTests.sort((a, b) => b.reports.length - a.reports.length);
        break;
      case 'testName':
        filteredTests.sort((a, b) => a.test.localeCompare(b.test));
        break;
      case 'failureRate':
        filteredTests.sort((a, b) => 
          (b.reports.length / selectedReports.length) - 
          (a.reports.length / selectedReports.length)
        );
        break;
    }

    return filteredTests;
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Test Report Analyzer
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
                  setSelectedReports(files.slice(0, value).map(f => f.name));
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
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Analysis Controls
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Sort By</InputLabel>
                      <Select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        label="Sort By"
                      >
                        <MenuItem value="failureCount">Failure Count</MenuItem>
                        <MenuItem value="testName">Test Name</MenuItem>
                        <MenuItem value="failureRate">Failure Rate</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Compare Reports</InputLabel>
                      <Select
                        multiple
                        value={selectedReports}
                        onChange={(e) => setSelectedReports(e.target.value)}
                        label="Compare Reports"
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.map((value) => (
                              <Chip key={value} label={value} size="small" />
                            ))}
                          </Box>
                        )}
                      >
                        {files.map((file) => (
                          <MenuItem key={file.name} value={file.name}>
                            <Checkbox checked={selectedReports.indexOf(file.name) > -1} />
                            {file.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>
                      Filters
                    </Typography>
                    <FormGroup row>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={filterOptions.showOnlyMultipleFailures}
                            onChange={(e) => setFilterOptions({
                              ...filterOptions,
                              showOnlyMultipleFailures: e.target.checked
                            })}
                          />
                        }
                        label="Show Only Multiple Failures"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={filterOptions.showOnlyConsistentFailures}
                            onChange={(e) => setFilterOptions({
                              ...filterOptions,
                              showOnlyConsistentFailures: e.target.checked
                            })}
                          />
                        }
                        label="Show Only Consistent Failures"
                      />
                    </FormGroup>
                    <TextField
                      type="number"
                      label="Minimum Failure Count"
                      value={filterOptions.minFailureCount}
                      onChange={(e) => setFilterOptions({
                        ...filterOptions,
                        minFailureCount: Math.max(1, parseInt(e.target.value) || 1)
                      })}
                      size="small"
                      sx={{ mt: 1 }}
                      InputProps={{ inputProps: { min: 1 } }}
                    />
                  </Grid>
                </Grid>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" gutterBottom>
                Test Analysis Results
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Test Name</TableCell>
                      <TableCell>Failed in Reports</TableCell>
                      <TableCell align="center">Failure Count</TableCell>
                      <TableCell align="center">Failure Rate</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filterAndSortFailingTests(analysisResults.failingTests).map(({ test, reports, allReports }) => (
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
                            label={`${reports.length}/${selectedReports.length}`}
                            color="error"
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {((reports.length / selectedReports.length) * 100).toFixed(1)}%
                            {(reports.length / selectedReports.length) > 0.5 ? (
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

        {searchResults && searchResults.stats.length > 0 ? (
          <>
            <Typography variant="subtitle2" gutterBottom>
              Matching Tests
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Test Name</TableCell>
                    <TableCell align="center">Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(searchResults.results).map(([test, statuses]) => (
                    <TableRow key={test}>
                      <TableCell>{test}</TableCell>
                      <TableCell align="center">
                        {Object.entries(statuses).map(([report, status]) => (
                          <Tooltip key={report} title={report}>
                            <Chip
                              label={status.toUpperCase()}
                              color={getStatusColor(status)}
                              size="small"
                              sx={{ m: 0.5 }}
                            />
                          </Tooltip>
                        ))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        ) : (
          <Typography color="text.secondary">
            No matching tests found
          </Typography>
        )}
      </Drawer>
    </Box>
  );
}

export default App; 