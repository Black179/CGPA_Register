import { useState, useEffect } from 'react';
import { Box, Heading, Table, Thead, Tbody, Tr, Th, Td, VStack, Text, Button, useToast, HStack } from '@chakra-ui/react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const AdminDashboard = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      console.log('Fetching students from API...');
      const response = await fetch('http://localhost:5000/api/admin/students');
      const data = await response.json();
      console.log('Received data:', data);
      setStudents(data);
      console.log('Students set:', data.length);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch student data',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const totalStudents = students.length;
    const totalSemesters = students.reduce((sum, student) => sum + (student?.semesters?.length || 0), 0);
    const avgCGPA = students.length > 0 
      ? (students.reduce((sum, student) => {
          if (!student?.semesters || student.semesters.length === 0) return sum;
          const totalCredits = student.semesters.reduce((creditSum, sem) => 
            creditSum + (sem.subjects?.reduce((subjectSum, subject) => subjectSum + subject.credits, 0) || 0), 0);
          const weightedSum = student.semesters.reduce((weightSum, sem) => 
            weightSum + (sem.sgpa * totalCredits), 0);
          return sum + (totalCredits > 0 ? weightedSum / totalCredits : 0);
        }, 0) / students.length)
      : 0;

    return { totalStudents, totalSemesters, avgCGPA };
  };

  // Function to process student data for semester-wise display
  const getStudentSemesterData = () => {
    const studentData = [];
    
    students.filter(student => student !== null).forEach((student, index) => {
      const semesters = student?.semesters || [];
      const sem1Data = semesters.find(sem => sem.semesterNo === 1) || {};
      const sem2Data = semesters.find(sem => sem.semesterNo === 2) || {};
      
      // Calculate arrears (grades below 'C' or gradePoint < 5)
      const calculateArrears = (subjects) => {
        if (!subjects) return { count: 0, total: 0 };
        const arrears = subjects.filter(subject => subject.gradePoint < 5);
        return { count: arrears.length, total: arrears.length };
      };
      
      // Calculate totals
      const calculateTotal = (subjects) => {
        if (!subjects) return 0;
        return subjects.reduce((sum, subject) => sum + subject.credits, 0);
      };
      
      const sem1Arrears = calculateArrears(sem1Data.subjects);
      const sem2Arrears = calculateArrears(sem2Data.subjects);
      const sem1Total = calculateTotal(sem1Data.subjects);
      const sem2Total = calculateTotal(sem2Data.subjects);
      
      // Calculate overall CGPA up to 2nd sem
      const allSubjects = [...(sem1Data.subjects || []), ...(sem2Data.subjects || [])];
      const totalCredits = allSubjects.reduce((sum, subject) => sum + subject.credits, 0);
      const weightedSum = allSubjects.reduce((sum, subject) => sum + (subject.gradePoint * subject.credits), 0);
      const overallCGPA = totalCredits > 0 ? weightedSum / totalCredits : 0;
      const overallTotal = sem1Total + sem2Total;
      const overallArrears = sem1Arrears.count + sem2Arrears.count;
      
      studentData.push({
        sno: index + 1,
        section: student?.section || 'N/A',
        registerNo: student?.registerNo || 'N/A',
        name: student?.name || 'N/A',
        sem1: {
          credit: 23,
          arrearsCount: sem1Arrears.count,
          arrearsTotal: sem1Arrears.total,
          total: sem1Total,
          sgpa: sem1Data.sgpa || 0
        },
        sem2: {
          credit: 24.5,
          arrearsCount: sem2Arrears.count,
          arrearsTotal: sem2Arrears.total,
          total: sem2Total,
          sgpa: sem2Data.sgpa || 0
        },
        overall: {
          cgpa: overallCGPA,
          total: overallTotal,
          totalArrears: overallArrears
        }
      });
    });
    
    return studentData;
  };

  const addTestData = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/admin/test-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Test data added successfully!',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        fetchStudents(); // Refresh the data
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to add test data',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error adding test data:', error);
      toast({
        title: 'Error',
        description: 'Failed to add test data',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const studentData = getStudentSemesterData();

  // Export to Excel function
  const exportToExcel = async () => {
    try {
      const ws = XLSX.utils.json_to_sheet(studentData.map(student => ({
        'S.No': student.sno,
        'SECTION': student.section,
        'REG NO': student.registerNo,
        'NAME': student.name,
        'SEM 1 - ARREAR COUNT': student.sem1.arrearsCount,
        'SEM 1 - TOTAL ARREAR': student.sem1.arrearsTotal,
        'SEM 1 - TOT': student.sem1.total,
        'SEM 1 - SGPA': student.sem1.sgpa,
        'SEM 2 - ARREAR COUNT': student.sem2.arrearsCount,
        'SEM 2 - TOTAL ARREAR': student.sem2.arrearsTotal,
        'SEM 2 - TOT': student.sem2.total,
        'SEM 2 - SGPA': student.sem2.sgpa,
        'CGPA (Upto 2nd Sem)': student.overall.cgpa,
        'TOT (Upto 2nd Sem)': student.overall.total,
        'Total Arrear (Upto 2nd Sem)': student.overall.totalArrears,
        'Signature': ''
      })));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Student Records');
      XLSX.writeFile(wb, 'CGPA_Student_Records.xlsx');
      
      toast({
        title: 'Success',
        description: 'Excel file exported successfully!',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast({
        title: 'Error',
        description: 'Failed to export Excel file',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Export to PDF function
  const exportToPDF = async () => {
    try {
      const element = document.getElementById('student-table');
      if (!element) {
        toast({
          title: 'Error',
          description: 'Table not found for export',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      const canvas = await html2canvas(element);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      
      const imgWidth = 280;
      const pageHeight = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save('CGPA_Student_Records.pdf');
      
      toast({
        title: 'Success',
        description: 'PDF file exported successfully!',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to export PDF file',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  if (loading) {
    return (
      <Box p={8}>
        <Text textAlign="center">Loading student data...</Text>
      </Box>
    );
  }

  const stats = calculateStats();

  return (
    <VStack spacing={6} p={6}>
      <Heading size="2xl" textAlign="center" color="blue.600">
        Admin Dashboard
      </Heading>

      {/* Statistics Cards */}
      <Box display="grid" gridTemplateColumns="repeat(3, 1fr)" gap={4} mb={6}>
        <Box p={4} borderRadius="8px" bg="white" boxShadow="0 2px 4px rgba(0,0,0,0.1)">
          <Text fontSize="lg" fontWeight="bold" color="blue.600">
            {stats.totalStudents}
          </Text>
          <Text fontSize="sm" color="gray.600">Total Students</Text>
        </Box>
        
        <Box p={4} borderRadius="8px" bg="white" boxShadow="0 2px 4px rgba(0,0,0,0.1)">
          <Text fontSize="lg" fontWeight="bold" color="green.600">
            {stats.totalSemesters}
          </Text>
          <Text fontSize="sm" color="gray.600">Total Semesters</Text>
        </Box>
        
        <Box p={4} borderRadius="8px" bg="white" boxShadow="0 2px 4px rgba(0,0,0,0.1)">
          <Text fontSize="lg" fontWeight="bold" color="purple.600">
            {stats.avgCGPA.toFixed(2)}
          </Text>
          <Text fontSize="sm" color="gray.600">Average CGPA</Text>
        </Box>
      </Box>

      {/* Students Table */}
      <Box bg="white" borderRadius="8px" p={6} boxShadow="0 2px 4px rgba(0,0,0,0.1)">
        <Heading size="lg" mb={4} color="gray.800">
          Student Academic Records (Semester-wise)
        </Heading>
        
        {studentData.length === 0 ? (
          <Text textAlign="center" color="gray.500" py={8}>
            No student records found in the database.
          </Text>
        ) : (
          <Box overflowX="auto">
            <Table id="student-table" variant="simple" size="sm" minWidth="1200px">
              <Thead>
                <Tr>
                  <Th rowSpan={2} textAlign="center">S.No</Th>
                  <Th rowSpan={2} textAlign="center">SECTION</Th>
                  <Th rowSpan={2} textAlign="center">REG NO</Th>
                  <Th rowSpan={2} textAlign="center">NAME</Th>
                  <Th colSpan={4} textAlign="center" bgColor="blue.50">SEM 1 (Credit-23)</Th>
                  <Th colSpan={4} textAlign="center" bgColor="green.50">SEM 2 (Credit-24.5)</Th>
                  <Th colSpan={3} textAlign="center" bgColor="purple.50">Overall (Upto 2nd Sem)</Th>
                  <Th rowSpan={2} textAlign="center">Signature</Th>
                </Tr>
                <Tr>
                  {/* SEM 1 Columns */}
                  <Th textAlign="center" fontSize="xs">ARREAR COUNT</Th>
                  <Th textAlign="center" fontSize="xs">TOTAL ARREAR</Th>
                  <Th textAlign="center" fontSize="xs">TOT</Th>
                  <Th textAlign="center" fontSize="xs">SGPA</Th>
                  {/* SEM 2 Columns */}
                  <Th textAlign="center" fontSize="xs">ARREAR COUNT</Th>
                  <Th textAlign="center" fontSize="xs">TOTAL ARREAR</Th>
                  <Th textAlign="center" fontSize="xs">TOT</Th>
                  <Th textAlign="center" fontSize="xs">SGPA</Th>
                  {/* Overall Columns */}
                  <Th textAlign="center" fontSize="xs">CGPA</Th>
                  <Th textAlign="center" fontSize="xs">TOT</Th>
                  <Th textAlign="center" fontSize="xs">Total Arrear</Th>
                </Tr>
              </Thead>
              <Tbody>
                {studentData.map((student) => (
                  <Tr key={student.registerNo}>
                    <Td textAlign="center">{student.sno}</Td>
                    <Td textAlign="center">{student.section}</Td>
                    <Td textAlign="center">{student.registerNo}</Td>
                    <Td>{student.name}</Td>
                    {/* SEM 1 Data */}
                    <Td textAlign="center">{student.sem1.arrearsCount}</Td>
                    <Td textAlign="center">{student.sem1.arrearsTotal}</Td>
                    <Td textAlign="center">{student.sem1.total}</Td>
                    <Td textAlign="center">{student.sem1.sgpa.toFixed(2)}</Td>
                    {/* SEM 2 Data */}
                    <Td textAlign="center">{student.sem2.arrearsCount}</Td>
                    <Td textAlign="center">{student.sem2.arrearsTotal}</Td>
                    <Td textAlign="center">{student.sem2.total}</Td>
                    <Td textAlign="center">{student.sem2.sgpa.toFixed(2)}</Td>
                    {/* Overall Data */}
                    <Td textAlign="center">{student.overall.cgpa.toFixed(2)}</Td>
                    <Td textAlign="center">{student.overall.total}</Td>
                    <Td textAlign="center">{student.overall.totalArrears}</Td>
                    <Td textAlign="center"></Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}

        <HStack spacing={4} mt={4}>
        <Button 
          onClick={fetchStudents}
          colorScheme="blue" 
          variant="outline"
        >
          Refresh Data
        </Button>
        
        <Button 
          onClick={addTestData}
          colorScheme="green" 
          variant="solid"
        >
          Add Test Data
        </Button>
        
        <Button 
          onClick={exportToExcel}
          colorScheme="yellow" 
          variant="solid"
          leftIcon={<span>📊</span>}
        >
          Export to Excel
        </Button>
        
        <Button 
          onClick={exportToPDF}
          colorScheme="red" 
          variant="solid"
          leftIcon={<span>📄</span>}
        >
          Export to PDF
        </Button>
      </HStack>
      </Box>
    </VStack>
  );
};

export default AdminDashboard;
